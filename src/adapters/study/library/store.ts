import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import { contentEntryId } from "./content-pack.js";
import type {
    LibraryAsset,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
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
            name: "study_library_content_packs",
            columns: [
                { name: "pack_id", type: "text", notNull: true },
                { name: "publisher", type: "text", notNull: true },
                { name: "version", type: "text", notNull: true },
                { name: "content_revision", type: "text", notNull: true },
                { name: "schema_id", type: "text", notNull: true },
                { name: "schema_version", type: "integer", notNull: true },
                { name: "digest", type: "text", notNull: true },
                { name: "record_count", type: "integer", notNull: true },
                { name: "relationship_count", type: "integer", notNull: true },
                {
                    name: "installed_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["publisher", "pack_id", "version"],
        });
        await this.db.ensureTable({
            name: "study_library_content_pack_assets",
            columns: [
                { name: "publisher", type: "text", notNull: true },
                { name: "pack_id", type: "text", notNull: true },
                { name: "version", type: "text", notNull: true },
                { name: "asset_path", type: "text", notNull: true },
                { name: "media_type", type: "text", notNull: true },
                { name: "data_base64", type: "text", notNull: true },
            ],
            primaryKey: ["publisher", "pack_id", "version", "asset_path"],
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
        const existing = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_schemas",
            where: [
                { column: "schema_id", value: schema.id },
                { column: "version", value: schema.version },
            ],
        });
        if (existing.rows?.length) {
            if (String(existing.rows[0].schema_json) !== JSON.stringify(schema))
                throw new Error("schema_version_conflict");
            return;
        }
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

    async ingestContentPack(
        plan: LibraryContentPackPlan,
    ): Promise<LibraryContentPackReceipt> {
        const { manifest, schema, records, digest } = plan;
        const existing = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_content_packs",
            where: [
                { column: "publisher", value: manifest.publisher },
                { column: "pack_id", value: manifest.id },
                { column: "version", value: manifest.version },
            ],
        });
        if (existing.rows?.length) {
            if (String(existing.rows[0].digest) !== digest)
                throw new Error("content_pack_version_conflict");
            return this.contentPackReceipt(plan, true);
        }
        await this.db.transaction(async (db) => {
            const registeredSchema = await db.executeCommand({
                option: "SELECT",
                table: "study_library_schemas",
                where: [
                    { column: "schema_id", value: schema.id },
                    { column: "version", value: schema.version },
                ],
            });
            if (registeredSchema.rows?.length) {
                if (
                    String(registeredSchema.rows[0].schema_json) !==
                    JSON.stringify(schema)
                ) {
                    throw new Error("schema_version_conflict");
                }
            } else {
                await db.executeCommand({
                    option: "INSERT",
                    table: "study_library_schemas",
                    values: {
                        schema_id: schema.id,
                        version: schema.version,
                        schema_json: JSON.stringify(schema),
                    },
                });
            }
            for (const record of records) {
                const layer = schema.layers.find(
                    ({ id }) => id === record.layer,
                )!;
                const fields = structuredClone(record.fields ?? {});
                for (const field of layer.fields ?? []) {
                    const assetPath = fields[field.id];
                    if (
                        field.type === "asset" &&
                        typeof assetPath === "string"
                    ) {
                        fields[field.id] = this.contentPackAssetUrl(
                            manifest.publisher,
                            manifest.id,
                            manifest.version,
                            assetPath,
                        );
                    }
                }
                await db.executeCommand({
                    option: "INSERT",
                    table: "study_library_entries",
                    values: {
                        id: contentEntryId(manifest, record.id),
                        scope: "global",
                        scope_id: "global",
                        schema_id: schema.id,
                        schema_version: schema.version,
                        layer: record.layer,
                        language: schema.language,
                        label: record.label.trim(),
                        fields_json: JSON.stringify(fields),
                        created_by: `content-pack:${manifest.id}`,
                    },
                });
            }
            for (const asset of plan.assets) {
                await db.executeCommand({
                    option: "INSERT",
                    table: "study_library_content_pack_assets",
                    values: {
                        publisher: manifest.publisher,
                        pack_id: manifest.id,
                        version: manifest.version,
                        asset_path: asset.path,
                        media_type: asset.mediaType,
                        data_base64: asset.data,
                    },
                });
            }
            for (const record of records) {
                for (const [index, reference] of (
                    record.references ?? []
                ).entries()) {
                    await db.executeCommand({
                        option: "INSERT",
                        table: "study_library_references",
                        values: {
                            source_entry_id: contentEntryId(
                                manifest,
                                record.id,
                            ),
                            target_entry_id: contentEntryId(
                                manifest,
                                reference.entryId,
                            ),
                            relation: reference.relation,
                            position: reference.position ?? index,
                        },
                    });
                }
            }
            await db.executeCommand({
                option: "INSERT",
                table: "study_library_content_packs",
                values: {
                    pack_id: manifest.id,
                    publisher: manifest.publisher,
                    version: manifest.version,
                    content_revision: manifest.contentRevision,
                    schema_id: schema.id,
                    schema_version: schema.version,
                    digest,
                    record_count: records.length,
                    relationship_count: records.reduce(
                        (count, record) =>
                            count + (record.references?.length ?? 0),
                        0,
                    ),
                },
            });
        });
        return this.contentPackReceipt(plan, false);
    }

    private contentPackAssetUrl(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): string {
        const encodedPath = assetPath
            .split("/")
            .map(encodeURIComponent)
            .join("/");
        return `/api/v1/study/library/assets/${encodeURIComponent(publisher)}/${encodeURIComponent(packId)}/${encodeURIComponent(version)}/${encodedPath}`;
    }

    async getContentPackAsset(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): Promise<LibraryAsset | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_content_pack_assets",
            where: [
                { column: "publisher", value: publisher },
                { column: "pack_id", value: packId },
                { column: "version", value: version },
                { column: "asset_path", value: assetPath },
            ],
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            mediaType: String(row.media_type) as LibraryAsset["mediaType"],
            data: Buffer.from(String(row.data_base64), "base64"),
        };
    }

    private contentPackReceipt(
        plan: LibraryContentPackPlan,
        unchanged: boolean,
    ): LibraryContentPackReceipt {
        return {
            packId: plan.manifest.id,
            publisher: plan.manifest.publisher,
            version: plan.manifest.version,
            contentRevision: plan.manifest.contentRevision,
            schemaId: plan.schema.id,
            schemaVersion: plan.schema.version,
            digest: plan.digest,
            recordCount: plan.records.length,
            relationshipCount: plan.records.reduce(
                (count, record) => count + (record.references?.length ?? 0),
                0,
            ),
            unchanged,
        };
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
        requestedId?: string,
    ): Promise<LibraryEntry> {
        const id = requestedId ?? randomUUID();
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
