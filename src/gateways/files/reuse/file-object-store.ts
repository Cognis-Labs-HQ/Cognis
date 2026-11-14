import type { FileObjectAcl } from "@cognis/core";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";

const TABLE_DEF: StructuredDbTableDef = {
    name: "file_objects",
    columns: [
        { name: "namespace_id", type: "text", notNull: true },
        { name: "object_key", type: "text", notNull: true },
        { name: "owner_id", type: "text", notNull: true },
        { name: "group_ids", type: "text" },
        {
            name: "public_read",
            type: "boolean",
            notNull: true,
            default: "false",
        },
        { name: "size_bytes", type: "bigint", notNull: true },
        {
            name: "created_at",
            type: "timestamp",
            notNull: true,
            default: "now",
        },
    ],
    primaryKey: ["namespace_id", "object_key"],
    indexes: [{ columns: ["owner_id"] }],
};

export interface FileObjectMetadata {
    acl: FileObjectAcl;
    sizeBytes: number;
}

interface FileObjectRow {
    namespace_id: string;
    object_key: string;
    owner_id: string;
    group_ids: string | null;
    public_read: boolean;
    size_bytes: number | string;
}

function rowToAcl(row: FileObjectRow): FileObjectAcl {
    return {
        ownerId: row.owner_id,
        groupIds: row.group_ids ? JSON.parse(row.group_ids) : undefined,
        publicRead: Boolean(row.public_read),
    };
}

/**
 * DB-backed metadata registry for namespaced file objects. Stores each
 * object's ACL grant (owner/groupIds/publicRead) so reads and deletes can be
 * authorized without touching the physical storage adapter, and doubles as
 * the usage ledger the quota adapter consults (summed in application code —
 * row counts per user are small and indexed by owner_id).
 *
 * The files gateway bootstraps before the DB gateway (see
 * GatewayService.bootstrap ordering), so schema creation is deferred to the
 * first actual call rather than performed at bootstrap time.
 */
export class DbFileObjectStore {
    private schemaReady: Promise<void> | undefined;

    constructor(private readonly getDb: () => DbExecutor | undefined) {}

    private async ensureSchema(): Promise<DbExecutor> {
        const executor = this.getDb();
        if (!executor) {
            throw new Error("db_executor_unavailable");
        }
        if (!this.schemaReady) {
            this.schemaReady = executor.ensureTable(TABLE_DEF);
        }
        await this.schemaReady;
        return executor;
    }

    async put(
        namespaceId: string,
        objectKey: string,
        acl: FileObjectAcl,
        sizeBytes: number,
    ): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_objects",
            values: {
                namespace_id: namespaceId,
                object_key: objectKey,
                owner_id: acl.ownerId,
                group_ids: acl.groupIds ? JSON.stringify(acl.groupIds) : null,
                public_read: acl.publicRead ?? false,
                size_bytes: sizeBytes,
            },
            conflict: {
                action: "update",
                target: ["namespace_id", "object_key"],
                update: {
                    owner_id: acl.ownerId,
                    group_ids: acl.groupIds
                        ? JSON.stringify(acl.groupIds)
                        : null,
                    public_read: acl.publicRead ?? false,
                    size_bytes: sizeBytes,
                },
            },
        });
    }

    async get(
        namespaceId: string,
        objectKey: string,
    ): Promise<FileObjectAcl | undefined> {
        return (await this.getMetadata(namespaceId, objectKey))?.acl;
    }

    async getMetadata(
        namespaceId: string,
        objectKey: string,
    ): Promise<FileObjectMetadata | undefined> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_objects",
            where: [
                { column: "namespace_id", value: namespaceId },
                { column: "object_key", value: objectKey },
            ],
            limit: 1,
        });
        const row = (result.rows as FileObjectRow[] | undefined)?.[0];
        return row
            ? { acl: rowToAcl(row), sizeBytes: Number(row.size_bytes) }
            : undefined;
    }

    async delete(namespaceId: string, objectKey: string): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "DELETE",
            table: "file_objects",
            where: [
                { column: "namespace_id", value: namespaceId },
                { column: "object_key", value: objectKey },
            ],
        });
    }

    async getNamespaceUsage(
        ownerId: string,
        namespaceId: string,
    ): Promise<number> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_objects",
            columns: ["size_bytes"],
            where: [
                { column: "owner_id", value: ownerId },
                { column: "namespace_id", value: namespaceId },
            ],
        });
        return sumSizes(result.rows as FileObjectRow[] | undefined);
    }

    async getGlobalUsage(ownerId: string): Promise<number> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_objects",
            columns: ["size_bytes"],
            where: [{ column: "owner_id", value: ownerId }],
        });
        return sumSizes(result.rows as FileObjectRow[] | undefined);
    }
}

function sumSizes(rows: FileObjectRow[] | undefined): number {
    if (!rows) return 0;
    return rows.reduce((total, row) => total + Number(row.size_bytes), 0);
}
