import { readSchemaJson, writeSchemaJson } from "./store/schema-storage.js";
import {
    replacePackAssets,
    readPackAsset,
    forgetPackAssets,
} from "./store/pack-assets.js";
import { executeReferences } from "./store/reference-storage.js";
import { retainedPackEntries } from "./store/retained-pack-entries.js";
import { replaceEntryContent } from "./store/entry-update.js";
import { hasImageReference } from "./image-store.js";
import type { CacheSnapshot } from "@cognis/core";
import {
    insertEntryReferences,
    entryReferenceRows,
    referenceTransformationValue,
} from "./store/reference-rows.js";
import type { StructuredDbWhereClause } from "../../../gateways/db/reuse/db-command.js";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { LibraryDictionaryResult } from "./service/dictionary.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import { contentEntryId, contentRecordHash } from "./content-pack.js";
import type {
    LibraryAsset,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
    LibraryEntry,
    LibraryEntryInput,
    LibraryEntryFilters,
    LibraryLocation,
    LibraryPushRequest,
    LibrarySchema,
} from "./types.js";
import { mapEntry } from "./entry-row.js";
import { hydrateEntries } from "./store/hydrate.js";
import { ensureLibraryStoreSchema } from "./db-schema.js";
import {
    captureRequestContext,
    createPushRequest,
    stagePushRequest,
    addEntryOwners,
    getPushRequest,
    listPushRequests,
    reviewPushRequest,
} from "./push-requests.js";
import { markEntriesViewed, moveEntry, viewedEntryIds } from "./entry-state.js";

export class LibraryStore {
    private readonly transactionContext = new AsyncLocalStorage<DbExecutor>();

    constructor(private readonly database: DbExecutor) {}

    private get db(): DbExecutor {
        return this.transactionContext.getStore() ?? this.database;
    }

    async transaction<T>(operation: () => Promise<T>): Promise<T> {
        if (this.transactionContext.getStore()) return operation();
        return this.database.transaction((executor) => {
            const scoped: DbExecutor = {
                executeCommand: executor.executeCommand.bind(executor),
                ensureTable: executor.ensureTable.bind(executor),
                transaction: (callback) => callback(scoped),
            };
            return this.transactionContext.run(scoped, operation);
        });
    }

    async dictionaryCache(
        key: string,
    ): Promise<CacheSnapshot<LibraryDictionaryResult[]> | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_dictionary_cache",
            where: [{ column: "cache_key", value: key }],
        });
        const row = result.rows?.[0];
        return row ? JSON.parse(String(row.results_json)) : null;
    }

    async saveDictionaryCache(
        key: string,
        snapshot: CacheSnapshot<LibraryDictionaryResult[]>,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_library_dictionary_cache",
            where: [
                {
                    column: "expires_at",
                    operator: "<=",
                    value: new Date().toISOString(),
                },
            ],
        });
        await this.upsert(
            this.db,
            "study_library_dictionary_cache",
            ["cache_key"],
            {
                cache_key: key,
                results_json: JSON.stringify(snapshot),
                cached_at: new Date(snapshot.publishedAt).toISOString(),
                expires_at: new Date(snapshot.expiresAt).toISOString(),
            },
        );
    }

    private async upsert(
        db: DbExecutor,
        table: string,
        conflictTarget: string[],
        values: Record<string, unknown>,
    ): Promise<void> {
        await db.executeCommand({
            option: "INSERT",
            table,
            values,
            conflict: {
                action: "update",
                target: conflictTarget,
                update: values,
            },
        });
    }

    async ensureSchema(): Promise<void> {
        await ensureLibraryStoreSchema(this.db);
    }

    async viewedEntryIds(accountId: string): Promise<string[]> {
        return viewedEntryIds(this.db, accountId);
    }

    async markEntriesViewed(
        accountId: string,
        entryIds: readonly string[],
    ): Promise<void> {
        await markEntriesViewed(this.db, accountId, entryIds);
    }

    async saveSchema(schema: LibrarySchema): Promise<void> {
        await this.db.transaction(async (db) => {
            const existing = await readSchemaJson(
                db,
                schema.id,
                schema.version,
            );
            if (existing !== null) {
                if (existing !== JSON.stringify(schema))
                    throw new Error("schema_version_conflict");
                return;
            }
            await writeSchemaJson(db, schema, false);
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
        const unchanged = Boolean(existing.rows?.length);
        let newRecordCount = 0;
        if (existing.rows?.length) {
            if (String(existing.rows[0].digest) !== digest)
                throw new Error("content_pack_version_conflict");
        }
        await this.db.transaction(async (db) => {
            const blacklist = await db.executeCommand({
                option: "SELECT",
                table: "study_library_content_hash_blacklist",
                columns: ["content_hash"],
            });
            const blockedHashes = new Set(
                (blacklist.rows ?? []).map((row) => String(row.content_hash)),
            );
            const canonicalIdsByHash = new Map<string, string>();
            const recordIdentity = new Map(
                records.flatMap((record) => {
                    const contentHash = contentRecordHash(
                        manifest,
                        schema,
                        record,
                    );
                    if (blockedHashes.has(contentHash)) return [];
                    const canonicalId =
                        canonicalIdsByHash.get(contentHash) ??
                        contentEntryId(manifest, record.id);
                    canonicalIdsByHash.set(contentHash, canonicalId);
                    return [[record.id, { canonicalId, contentHash }] as const];
                }),
            );
            const previousEntries = await db.executeCommand({
                option: "SELECT",
                table: "study_library_entries",
                columns: ["id", "provider_modified"],
                where: [
                    {
                        column: "created_by",
                        value: `content-pack:${manifest.publisher}:${manifest.id}`,
                    },
                    { column: "schema_id", value: schema.id },
                ],
            });
            const previousEntryIds = new Set(
                (previousEntries.rows ?? []).map((row) => String(row.id)),
            );
            const providerModifiedEntryIds = new Set(
                (previousEntries.rows ?? [])
                    .filter(
                        (row) =>
                            row.provider_modified === true ||
                            Number(row.provider_modified) === 1,
                    )
                    .map((row) => String(row.id)),
            );
            newRecordCount = new Set(
                Array.from(recordIdentity.values(), ({ canonicalId }) =>
                    previousEntryIds.has(canonicalId) ? null : canonicalId,
                ).filter((id): id is string => id !== null),
            ).size;
            const registeredSchema = await readSchemaJson(
                db,
                schema.id,
                schema.version,
            );
            if (registeredSchema !== null) {
                if (registeredSchema !== JSON.stringify(schema)) {
                    const schemaOwners = await db.executeCommand({
                        option: "SELECT",
                        table: "study_library_content_packs",
                        columns: ["publisher", "pack_id"],
                        where: [
                            { column: "schema_id", value: schema.id },
                            { column: "schema_version", value: schema.version },
                        ],
                    });
                    if (
                        !schemaOwners.rows?.length ||
                        schemaOwners.rows.some(
                            (owner) =>
                                String(owner.publisher) !==
                                    manifest.publisher ||
                                String(owner.pack_id) !== manifest.id,
                        )
                    ) {
                        throw new Error("schema_version_conflict");
                    }
                    await writeSchemaJson(db, schema, true);
                }
            } else {
                await writeSchemaJson(db, schema, false);
            }
            const importedSourceIds = new Set(
                Array.from(
                    recordIdentity.values(),
                    ({ canonicalId }) => canonicalId,
                ),
            );
            if (manifest.pruneOmittedRecords !== false) {
                const retained = await retainedPackEntries(
                    db,
                    previousEntryIds,
                    importedSourceIds,
                    providerModifiedEntryIds,
                );
                for (const row of previousEntries.rows ?? []) {
                    const previousId = String(row.id);
                    if (
                        importedSourceIds.has(previousId) ||
                        retained.has(previousId)
                    )
                        continue;
                    for (const column of [
                        "source_entry_id",
                        "target_entry_id",
                    ]) {
                        await executeReferences(db, {
                            option: "DELETE",
                            where: [{ column, value: previousId }],
                        });
                    }
                    await db.executeCommand({
                        option: "DELETE",
                        table: "study_library_entries",
                        where: [{ column: "id", value: previousId }],
                    });
                }
            }
            const replacedSources = [...importedSourceIds].filter(
                (id) => !providerModifiedEntryIds.has(id),
            );
            for (
                let offset = 0;
                offset < replacedSources.length;
                offset += 500
            ) {
                await executeReferences(db, {
                    option: "DELETE",
                    where: [
                        {
                            column: "source_entry_id",
                            operator: "IN",
                            value: replacedSources.slice(offset, offset + 500),
                        },
                    ],
                });
            }
            for (const record of records) {
                const identity = recordIdentity.get(record.id);
                if (!identity) continue;
                if (providerModifiedEntryIds.has(identity.canonicalId))
                    continue;
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
                    if (
                        ["assetList", "imageList"].includes(field.type) &&
                        Array.isArray(assetPath)
                    ) {
                        fields[field.id] = assetPath.map((item) =>
                            this.contentPackAssetUrl(
                                manifest.publisher,
                                manifest.id,
                                manifest.version,
                                String(item),
                            ),
                        );
                    }
                }
                const { canonicalId: id, contentHash } = identity;
                await this.upsert(db, "study_library_entries", ["id"], {
                    id,
                    scope: "global",
                    scope_id: "global",
                    schema_id: schema.id,
                    schema_version: schema.version,
                    layer: record.layer,
                    language: schema.language,
                    label: record.label.trim(),
                    class: record.class ?? null,
                    tags_json: JSON.stringify(record.tags ?? []),
                    source_record_id: record.id,
                    display_id: record.displayId ?? null,
                    hidden: record.hidden === true,
                    always_show_definition:
                        record.alwaysShowDefinition === true,
                    protected: manifest.protected === true,
                    editable: record.editable !== false,
                    fields_json: JSON.stringify(fields),
                    search_text:
                        `${record.label} ${(record.tags ?? []).join(" ")} ${JSON.stringify(fields)}`
                            .normalize()
                            .toLocaleLowerCase(),
                    content_hash: contentHash,
                    created_by: `content-pack:${manifest.publisher}:${manifest.id}`,
                    updated_at: new Date().toISOString(),
                });
            }
            await replacePackAssets(db, plan);
            for (const record of records) {
                const source = recordIdentity.get(record.id);
                if (!source) continue;
                if (providerModifiedEntryIds.has(source.canonicalId)) continue;
                for (const row of entryReferenceRows(record)) {
                    const target = recordIdentity.get(row.reference.entryId);
                    if (!target) continue;
                    if (
                        record.id === row.reference.entryId ||
                        source.canonicalId === target.canonicalId
                    ) {
                        continue;
                    }
                    const values = {
                        source_entry_id: source.canonicalId,
                        target_entry_id: target.canonicalId,
                        relation: row.reference.relation,
                        group_index: row.groupIndex,
                        position: row.position,
                        transformation_json: referenceTransformationValue(
                            row.reference,
                        ),
                    };
                    await executeReferences(db, {
                        option: "INSERT",
                        values,
                        conflict: { action: "ignore" },
                    });
                }
            }
            if (!unchanged) {
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
                                count + entryReferenceRows(record).length,
                            0,
                        ),
                        metadata_json: JSON.stringify(manifest.metadata ?? {}),
                    },
                });
            }
        });
        return this.contentPackReceipt(plan, unchanged, newRecordCount);
    }

    async contentPackEntries(
        publisher: string,
        packId: string,
    ): Promise<LibraryEntry[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_entries",
            where: [
                {
                    column: "created_by",
                    value: `content-pack:${publisher}:${packId}`,
                },
            ],
        });
        return (result.rows ?? []).map(mapEntry);
    }

    async forgetContentPack(publisher: string, packId: string): Promise<void> {
        await this.transaction(async () => {
            await forgetPackAssets(this.db, publisher, packId);
            await this.db.executeCommand({
                option: "DELETE",
                table: "study_library_content_packs",
                where: [
                    { column: "publisher", value: publisher },
                    { column: "pack_id", value: packId },
                ],
            });
        });
    }

    async deleteEntries(
        entryIds: readonly string[],
        deletedBy: string,
        blacklistContentHashes: boolean,
        authorize: (
            entries: readonly LibraryEntry[],
        ) => Promise<void> = async () => {},
        perform?: (
            entries: readonly LibraryEntry[],
            remove: () => Promise<void>,
        ) => Promise<void>,
    ): Promise<readonly string[]> {
        let deletedEntryIds: readonly string[] = [];
        await this.db.transaction(async (db) => {
            deletedEntryIds = await this.resolveDeletionCascade(entryIds, db);
            const entries: LibraryEntry[] = [];
            for (const entryId of deletedEntryIds) {
                const entryResult = await db.executeCommand({
                    option: "SELECT",
                    table: "study_library_entries",
                    where: [{ column: "id", value: entryId }],
                });
                const row = entryResult.rows?.[0];
                if (!row) throw new Error("not_found");
                entries.push(mapEntry(row));
            }
            await authorize(entries);
            const remove = async () => {
                for (const entryId of deletedEntryIds) {
                    const result = await db.executeCommand({
                        option: "SELECT",
                        table: "study_library_entries",
                        columns: ["content_hash"],
                        where: [{ column: "id", value: entryId }],
                    });
                    const contentHash = result.rows?.[0]?.content_hash;
                    if (
                        blacklistContentHashes &&
                        typeof contentHash === "string"
                    ) {
                        await db.executeCommand({
                            option: "INSERT",
                            table: "study_library_content_hash_blacklist",
                            values: {
                                content_hash: contentHash,
                                deleted_by: deletedBy,
                            },
                            conflict: { action: "ignore" },
                        });
                    }
                    for (const column of [
                        "source_entry_id",
                        "target_entry_id",
                    ]) {
                        await executeReferences(db, {
                            option: "DELETE",
                            where: [{ column, value: entryId }],
                        });
                    }
                    await db.executeCommand({
                        option: "DELETE",
                        table: "study_library_entries",
                        where: [{ column: "id", value: entryId }],
                    });
                }
            };
            if (perform) await perform(entries, remove);
            else await remove();
        });
        return deletedEntryIds;
    }

    async resolveDeletionCascade(
        entryIds: readonly string[],
        db: DbExecutor = this.db,
        includeRestricted = false,
    ): Promise<readonly string[]> {
        const cascadeIds = new Set(entryIds);
        const restrictedIds = new Set<string>();
        const pendingIds = [...entryIds];
        const schemaCache = new Map<string, LibrarySchema>();
        while (pendingIds.length > 0) {
            const targetEntryId = pendingIds.shift()!;
            const dependents = await executeReferences(db, {
                option: "SELECT",
                columns: ["source_entry_id", "relation"],
                where: [{ column: "target_entry_id", value: targetEntryId }],
            });
            for (const row of dependents.rows ?? []) {
                const dependentId = String(row.source_entry_id);
                if (cascadeIds.has(dependentId)) continue;
                const sourceResult = await db.executeCommand({
                    option: "SELECT",
                    table: "study_library_entries",
                    columns: ["schema_id", "schema_version", "layer"],
                    where: [{ column: "id", value: dependentId }],
                });
                const source = sourceResult.rows?.[0];
                if (!source) continue;
                const schemaKey = `${String(source.schema_id)}:${Number(source.schema_version)}`;
                let schema = schemaCache.get(schemaKey);
                if (!schema) {
                    const schemaJson = await readSchemaJson(
                        db,
                        String(source.schema_id),
                        Number(source.schema_version),
                    );
                    if (!schemaJson) throw new Error("schema_not_found");
                    schema = JSON.parse(schemaJson) as LibrarySchema;
                    schemaCache.set(schemaKey, schema);
                }
                const relationship = schema.layers
                    .find((layer) => layer.id === String(source.layer))
                    ?.relationships?.find(
                        (candidate) => candidate.id === String(row.relation),
                    );
                if (!relationship) throw new Error("relationship_not_found");
                if (
                    relationship.onDelete === "restrict" &&
                    !includeRestricted
                ) {
                    restrictedIds.add(dependentId);
                    continue;
                }
                if (relationship.onDelete === "detach") continue;
                cascadeIds.add(dependentId);
                pendingIds.push(dependentId);
            }
        }
        if (Array.from(restrictedIds).some((id) => !cascadeIds.has(id)))
            throw new Error("relationship_delete_restricted");
        return Array.from(cascadeIds);
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

    async hasImageReference(value: string): Promise<boolean> {
        return hasImageReference(this.db, value);
    }

    async getContentPackAsset(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): Promise<LibraryAsset | null> {
        return readPackAsset(this.db, publisher, packId, version, assetPath);
    }

    private contentPackReceipt(
        plan: LibraryContentPackPlan,
        unchanged: boolean,
        newRecordCount: number,
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
            newRecordCount,
            relationshipCount: plan.records.reduce(
                (count, record) => count + entryReferenceRows(record).length,
                0,
            ),
            ...(plan.manifest.metadata
                ? { metadata: structuredClone(plan.manifest.metadata) }
                : {}),
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
        return (await hydrateEntries(this.db, [row]))[0];
    }

    async list(
        location: LibraryLocation,
        filters: LibraryEntryFilters = {},
    ): Promise<LibraryEntry[]> {
        if (
            filters.entryIds?.length === 0 ||
            filters.sourceRecordIds?.length === 0
        )
            return [];
        const where: StructuredDbWhereClause[] = [
            { column: "scope", value: location.scope },
            { column: "scope_id", value: location.scopeId ?? location.scope },
        ];
        if (filters.schemaId)
            where.push({ column: "schema_id", value: filters.schemaId });
        if (filters.layer)
            where.push({ column: "layer", value: filters.layer });
        for (const [key, column] of [
            ["entryIds", "id"],
            ["sourceRecordIds", "source_record_id"],
        ] as const) {
            if (filters[key])
                where.push({ column, operator: "IN", value: filters[key] });
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_library_entries",
            where,
        });
        return hydrateEntries(this.db, result.rows ?? []);
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
                    class: input.class ?? null,
                    tags_json: JSON.stringify(input.tags ?? []),
                    hidden: input.hidden === true,
                    always_show_definition: input.alwaysShowDefinition === true,
                    protected: false,
                    fields_json: JSON.stringify(input.fields ?? {}),
                    search_text:
                        `${input.label} ${(input.tags ?? []).join(" ")} ${JSON.stringify(input.fields ?? {})}`
                            .normalize()
                            .toLocaleLowerCase(),
                    created_by: accountId,
                },
            });
            await insertEntryReferences(transactionDb, id, input);
        });
        return (await this.get(id))!;
    }

    async update(
        id: string,
        input: LibraryEntryInput,
        providerModified = false,
    ): Promise<LibraryEntry> {
        await this.db.transaction((transactionDb) =>
            replaceEntryContent(transactionDb, id, input, providerModified),
        );
        return (await this.get(id))!;
    }

    async updateField(
        id: string,
        fieldId: string,
        value: unknown,
        expectedUpdatedAt: string,
    ): Promise<boolean> {
        return this.transaction(async () => {
            const selected = await this.db.executeCommand({
                option: "SELECT",
                table: "study_library_entries",
                where: [{ column: "id", value: id }],
            });
            const row = selected.rows?.[0];
            if (!row) return false;
            const entry = mapEntry(row);
            if (entry.updatedAt !== expectedUpdatedAt) return false;
            const fields = { ...entry.fields, [fieldId]: value };
            const result = await this.db.executeCommand({
                option: "UPDATE",
                table: "study_library_entries",
                set: {
                    fields_json: JSON.stringify(fields),
                    search_text:
                        `${entry.label} ${(entry.tags ?? []).join(" ")} ${JSON.stringify(fields)}`
                            .normalize()
                            .toLocaleLowerCase(),
                    updated_at: new Date().toISOString(),
                },
                where: [
                    { column: "id", value: id },
                    { column: "updated_at", value: expectedUpdatedAt },
                ],
            });
            return result.rowCount === 1;
        });
    }

    async move(
        id: string,
        destination: LibraryLocation,
    ): Promise<LibraryEntry> {
        await moveEntry(this.db, id, destination);
        return (await this.get(id))!;
    }

    async createPush(
        sourceEntryId: string,
        destination: LibraryLocation,
        accountId: string,
        kind: "promotion" | "update" | "merge" = "promotion",
        proposedEntry?: LibraryEntryInput,
    ): Promise<LibraryPushRequest> {
        try {
            return await this.transaction(async () => {
                const sourceSnapshot = await this.get(sourceEntryId);
                if (!sourceSnapshot) throw new Error("reference_not_found");
                const sourceContext = await captureRequestContext(
                    sourceSnapshot,
                    this.get.bind(this),
                );
                return createPushRequest(
                    this.db,
                    sourceEntryId,
                    destination,
                    accountId,
                    kind,
                    proposedEntry,
                    sourceSnapshot,
                    sourceContext,
                );
            });
        } catch (error) {
            if (
                (await this.listPushRequests("pending")).some(
                    (request) => request.sourceEntryId === sourceEntryId,
                )
            )
                throw new Error("request_pending");
            throw error;
        }
    }

    async getPush(id: string): Promise<LibraryPushRequest | null> {
        return getPushRequest(this.db, id);
    }

    async listPushRequests(
        status?: LibraryPushRequest["status"],
    ): Promise<LibraryPushRequest[]> {
        return listPushRequests(this.db, status);
    }

    async stagePush(
        id: string,
        entry: LibraryEntryInput,
        actorId: string,
    ): Promise<LibraryPushRequest> {
        return stagePushRequest(this.db, id, entry, actorId);
    }

    async addOwners(id: string, owners: readonly string[]): Promise<void> {
        await addEntryOwners(this.db, id, owners);
    }

    async reviewPush(
        id: string,
        status: "approved" | "rejected" | "withdrawn",
        reviewerId: string,
    ): Promise<void> {
        await reviewPushRequest(this.db, id, status, reviewerId);
    }

    async referencesFor(targetEntryId: string): Promise<LibraryEntry[]> {
        const result = await executeReferences(this.db, {
            option: "SELECT",
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
