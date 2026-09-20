import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import type {
    FileQuotaStore,
    NamespaceQuotaDefaults,
    UserQuotaSnapshot,
} from "../../../gateways/files/reuse/quota-store-contract.js";

const DEFAULT_NAMESPACE_QUOTA_BYTES = 1_073_741_824; // 1 GiB
const DEFAULT_GLOBAL_QUOTA_BYTES = 5_368_709_120; // 5 GiB
const GLOBAL_DEFAULT_ROW_ID = "global";

const NAMESPACE_DEFAULTS_TABLE: StructuredDbTableDef = {
    name: "file_namespace_quota_defaults",
    columns: [
        { name: "namespace_id", type: "text", primaryKey: true },
        { name: "quota_bytes", type: "bigint", notNull: true },
    ],
};

const GLOBAL_DEFAULT_TABLE: StructuredDbTableDef = {
    name: "file_global_quota_default",
    columns: [
        { name: "id", type: "text", primaryKey: true },
        { name: "quota_bytes", type: "bigint", notNull: true },
    ],
};

const USER_NAMESPACE_QUOTAS_TABLE: StructuredDbTableDef = {
    name: "file_user_namespace_quotas",
    columns: [
        { name: "username", type: "text", notNull: true },
        { name: "namespace_id", type: "text", notNull: true },
        { name: "quota_bytes", type: "bigint", notNull: true },
    ],
    primaryKey: ["username", "namespace_id"],
};

const USER_GLOBAL_QUOTAS_TABLE: StructuredDbTableDef = {
    name: "file_user_global_quotas",
    columns: [
        { name: "username", type: "text", primaryKey: true },
        { name: "quota_bytes", type: "bigint", notNull: true },
    ],
};

/**
 * DB-backed FileQuotaStore. Tracks admin-configurable default quotas per
 * namespace plus a single global default, and per-user overrides that are
 * snapshotted from those defaults at account-creation time (provisionUser)
 * so existing users keep the quotas that applied when they registered.
 *
 * Like the files gateway itself, this adapter bootstraps before the DB
 * gateway is guaranteed to be ready, so schema creation is deferred to the
 * first real call.
 */
export class DbFileQuotaStore implements FileQuotaStore {
    private schemaReady: Promise<void> | undefined;

    constructor(private readonly getDb: () => DbExecutor | undefined) {}

    private async ensureSchema(): Promise<DbExecutor> {
        const executor = this.getDb();
        if (!executor) {
            throw new Error("db_executor_unavailable");
        }
        if (!this.schemaReady) {
            this.schemaReady = (async () => {
                await executor.ensureTable(NAMESPACE_DEFAULTS_TABLE);
                await executor.ensureTable(GLOBAL_DEFAULT_TABLE);
                await executor.ensureTable(USER_NAMESPACE_QUOTAS_TABLE);
                await executor.ensureTable(USER_GLOBAL_QUOTAS_TABLE);
            })();
        }
        await this.schemaReady;
        return executor;
    }

    async ensureNamespaceDefault(
        namespaceId: string,
        quotaBytes: number = DEFAULT_NAMESPACE_QUOTA_BYTES,
    ): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_namespace_quota_defaults",
            values: { namespace_id: namespaceId, quota_bytes: quotaBytes },
            conflict: { action: "ignore", target: ["namespace_id"] },
        });
    }

    async listNamespaceDefaults(): Promise<NamespaceQuotaDefaults[]> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_namespace_quota_defaults",
        });
        return (
            (result.rows as
                | Array<{ namespace_id: string; quota_bytes: number }>
                | undefined) ?? []
        ).map((row) => ({
            namespaceId: row.namespace_id,
            quotaBytes: Number(row.quota_bytes),
        }));
    }

    async setNamespaceDefault(
        namespaceId: string,
        quotaBytes: number,
    ): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_namespace_quota_defaults",
            values: { namespace_id: namespaceId, quota_bytes: quotaBytes },
            conflict: {
                action: "update",
                target: ["namespace_id"],
                update: { quota_bytes: quotaBytes },
            },
        });
    }

    async getGlobalDefault(): Promise<number> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_global_quota_default",
            where: [{ column: "id", value: GLOBAL_DEFAULT_ROW_ID }],
            limit: 1,
        });
        const row = (
            result.rows as Array<{ quota_bytes: number }> | undefined
        )?.[0];
        return row ? Number(row.quota_bytes) : DEFAULT_GLOBAL_QUOTA_BYTES;
    }

    async setGlobalDefault(quotaBytes: number): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_global_quota_default",
            values: { id: GLOBAL_DEFAULT_ROW_ID, quota_bytes: quotaBytes },
            conflict: {
                action: "update",
                target: ["id"],
                update: { quota_bytes: quotaBytes },
            },
        });
    }

    async provisionUser(username: string): Promise<void> {
        const executor = await this.ensureSchema();
        const defaults = await this.listNamespaceDefaults();
        for (const { namespaceId, quotaBytes } of defaults) {
            await executor.executeCommand({
                option: "INSERT",
                table: "file_user_namespace_quotas",
                values: {
                    username,
                    namespace_id: namespaceId,
                    quota_bytes: quotaBytes,
                },
                conflict: {
                    action: "ignore",
                    target: ["username", "namespace_id"],
                },
            });
        }
        const globalDefault = await this.getGlobalDefault();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_user_global_quotas",
            values: { username, quota_bytes: globalDefault },
            conflict: { action: "ignore", target: ["username"] },
        });
    }

    async getUserNamespaceQuota(
        username: string,
        namespaceId: string,
    ): Promise<number | undefined> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_user_namespace_quotas",
            where: [
                { column: "username", value: username },
                { column: "namespace_id", value: namespaceId },
            ],
            limit: 1,
        });
        const row = (
            result.rows as Array<{ quota_bytes: number }> | undefined
        )?.[0];
        return row ? Number(row.quota_bytes) : undefined;
    }

    async setUserNamespaceQuota(
        username: string,
        namespaceId: string,
        quotaBytes: number,
    ): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_user_namespace_quotas",
            values: {
                username,
                namespace_id: namespaceId,
                quota_bytes: quotaBytes,
            },
            conflict: {
                action: "update",
                target: ["username", "namespace_id"],
                update: { quota_bytes: quotaBytes },
            },
        });
    }

    async listUserQuotas(username: string): Promise<UserQuotaSnapshot[]> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_user_namespace_quotas",
            where: [{ column: "username", value: username }],
        });
        return (
            (result.rows as
                | Array<{ namespace_id: string; quota_bytes: number }>
                | undefined) ?? []
        ).map((row) => ({
            namespaceId: row.namespace_id,
            quotaBytes: Number(row.quota_bytes),
        }));
    }

    async getUserGlobalQuota(username: string): Promise<number | undefined> {
        const executor = await this.ensureSchema();
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "file_user_global_quotas",
            where: [{ column: "username", value: username }],
            limit: 1,
        });
        const row = (
            result.rows as Array<{ quota_bytes: number }> | undefined
        )?.[0];
        return row ? Number(row.quota_bytes) : undefined;
    }

    async setUserGlobalQuota(
        username: string,
        quotaBytes: number,
    ): Promise<void> {
        const executor = await this.ensureSchema();
        await executor.executeCommand({
            option: "INSERT",
            table: "file_user_global_quotas",
            values: { username, quota_bytes: quotaBytes },
            conflict: {
                action: "update",
                target: ["username"],
                update: { quota_bytes: quotaBytes },
            },
        });
    }
}
