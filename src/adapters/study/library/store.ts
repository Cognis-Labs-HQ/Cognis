import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibraryPushRequest,
    LibrarySchema,
} from "./types.js";

function mapEntry(row: Record<string, unknown>): LibraryEntry {
    return {
        id: String(row.id),
        schemaId: String(row.schema_id),
        schemaVersion: Number(row.schema_version),
        layer: String(row.layer),
        language: String(row.language),
        label: String(row.label),
        fields: JSON.parse(String(row.fields_json ?? "{}")),
        references: [],
        scope: String(row.scope) as LibraryEntry["scope"],
        scopeId: String(row.scope_id),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
}

export class LibraryStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "study_library_schemas",
            columns: [
                { name: "schema_id", type: "text", notNull: true },
                { name: "version", type: "integer", notNull: true },
                { name: "schema_json", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["schema_id", "version"],
        });
        await this.db.ensureTable({
            name: "study_library_entries",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "scope", type: "text", notNull: true },
                { name: "scope_id", type: "text", notNull: true },
                { name: "schema_id", type: "text", notNull: true },
                { name: "schema_version", type: "integer", notNull: true },
                { name: "layer", type: "text", notNull: true },
                { name: "language", type: "text", notNull: true },
                { name: "label", type: "text", notNull: true },
                {
                    name: "fields_json",
                    type: "text",
                    notNull: true,
                    default: "{}",
                },
                { name: "created_by", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });
        await this.db.ensureTable({
            name: "study_library_references",
            columns: [
                { name: "source_entry_id", type: "text", notNull: true },
                { name: "target_entry_id", type: "text", notNull: true },
                {
                    name: "relation",
                    type: "text",
                    notNull: true,
                    default: "contains",
                },
                {
                    name: "position",
                    type: "integer",
                    notNull: true,
                    default: 0,
                },
            ],
            primaryKey: [
                "source_entry_id",
                "target_entry_id",
                "relation",
                "position",
            ],
        });
        await this.db.ensureTable({
            name: "study_library_push_requests",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "source_entry_id", type: "text", notNull: true },
                { name: "destination_scope", type: "text", notNull: true },
                { name: "destination_scope_id", type: "text", notNull: true },
                { name: "requested_by", type: "text", notNull: true },
                {
                    name: "status",
                    type: "text",
                    notNull: true,
                    default: "pending",
                },
                { name: "reviewed_by", type: "text" },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });
    }

    async saveSchema(schema: LibrarySchema): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_library_schemas",
            values: {
                schema_id: schema.id,
                version: schema.version,
                schema_json: JSON.stringify(schema),
            },
        });
    }

    async get(id: string): Promise<LibraryEntry | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_entries",
            where: [{ column: "id", value: id }],
        });
        const row = result.rows?.[0];
        if (!row) return null;
        const entry = mapEntry(row);
        const references = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_references",
            where: [{ column: "source_entry_id", value: id }],
        });
        entry.references = (references.rows ?? []).map((reference) => ({
            entryId: String(reference.target_entry_id),
            relation: String(reference.relation),
            position: Number(reference.position),
        }));
        return entry;
    }

    async list(
        location: LibraryLocation,
        filters: { schemaId?: string; layer?: string } = {},
    ): Promise<LibraryEntry[]> {
        const where = [
            { column: "scope", value: location.scope },
            { column: "scope_id", value: location.scopeId ?? location.scope },
        ];
        if (filters.schemaId)
            where.push({ column: "schema_id", value: filters.schemaId });
        if (filters.layer)
            where.push({ column: "layer", value: filters.layer });
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_entries",
            where,
        });
        return Promise.all(
            (result.rows ?? []).map((row) => this.get(String(row.id))),
        ).then((entries) =>
            entries.filter((entry): entry is LibraryEntry => entry !== null),
        );
    }

    async create(
        location: LibraryLocation,
        input: LibraryEntryInput,
        language: string,
        accountId: string,
    ): Promise<LibraryEntry> {
        const id = randomUUID();
        await this.db.transaction(async (transactionDb) => {
            await transactionDb.executeCommand({
                option: "INSERT",
                table: "study_library_entries",
                values: {
                    id,
                    scope: location.scope,
                    scope_id: location.scopeId ?? location.scope,
                    schema_id: input.schemaId,
                    schema_version: input.schemaVersion,
                    layer: input.layer,
                    language,
                    label: input.label,
                    fields_json: JSON.stringify(input.fields ?? {}),
                    created_by: accountId,
                },
            });
            for (const [position, reference] of (
                input.references ?? []
            ).entries()) {
                await transactionDb.executeCommand({
                    option: "INSERT",
                    table: "study_library_references",
                    values: {
                        source_entry_id: id,
                        target_entry_id: reference.entryId,
                        relation: reference.relation ?? "contains",
                        position: reference.position ?? position,
                    },
                });
            }
        });
        return (await this.get(id))!;
    }

    async createPush(
        sourceEntryId: string,
        destination: LibraryLocation,
        accountId: string,
    ): Promise<LibraryPushRequest> {
        const id = randomUUID();
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_library_push_requests",
            values: {
                id,
                source_entry_id: sourceEntryId,
                destination_scope: destination.scope,
                destination_scope_id: destination.scopeId ?? destination.scope,
                requested_by: accountId,
            },
        });
        return {
            id,
            sourceEntryId,
            destination,
            requestedBy: accountId,
            status: "pending",
        };
    }

    async getPush(id: string): Promise<LibraryPushRequest | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_push_requests",
            where: [{ column: "id", value: id }],
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            id: String(row.id),
            sourceEntryId: String(row.source_entry_id),
            destination: {
                scope: String(
                    row.destination_scope,
                ) as LibraryLocation["scope"],
                scopeId: String(row.destination_scope_id),
            },
            requestedBy: String(row.requested_by),
            status: String(row.status) as LibraryPushRequest["status"],
        };
    }

    async reviewPush(
        id: string,
        status: "approved" | "rejected",
        reviewerId: string,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "study_library_push_requests",
            values: {
                status,
                reviewed_by: reviewerId,
                updated_at: new Date().toISOString(),
            },
            where: [
                { column: "id", value: id },
                { column: "status", value: "pending" },
            ],
        });
    }

    async referencesFor(targetEntryId: string): Promise<LibraryEntry[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_references",
            where: [{ column: "target_entry_id", value: targetEntryId }],
        });
        const entries = await Promise.all(
            (result.rows ?? []).map((row) =>
                this.get(String(row.source_entry_id)),
            ),
        );
        return entries.filter((entry): entry is LibraryEntry => entry !== null);
    }
}
