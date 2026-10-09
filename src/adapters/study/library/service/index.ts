import { createLinkedEntryGraph } from "./linked-entries.js";
import { findContentConflict } from "./content-conflicts.js";
import { storeContentPackAudio } from "./content-audio.js";
import {
    LibraryDictionarySearch,
    lookupDictionarySuggestions,
} from "./dictionary.js";
import {
    validateEntryInput,
    validateEntryFilters,
    validateEntryFields,
    normalizeEntryClass,
} from "./input.js";
import {
    alignFormContributions,
    applyFormContributions,
} from "./form-contributions.js";
import { localizeDefinition, prepareDefinitionFields } from "./definitions.js";
import type { LibraryDefinitionLocalizationRequest } from "../types.js";
import { authorizeDeletion, planDeletion } from "./deletion.js";
import { entryPermissions } from "./permissions.js";
import { validateUpdateProposal } from "./proposals.js";
import {
    normalizeLocation,
    validateDependencyVisibility,
    validateEntrySelection,
    validatePendingPublicationEdits,
} from "./dependencies.js";
import { traceEntry } from "./trace.js";
import type { FlowApi, ProbeCacheFactory } from "@cognis/core";
import { randomUUID } from "node:crypto";
import { inspectContentPack } from "../content-pack.js";
import {
    findLayer,
    resolveRelationships,
    validateLibrarySchema,
    validateReferences,
} from "../layers.js";
import { LibraryStore } from "../store.js";
import { LibraryAudioCache } from "../audio-cache.js";
import { LibraryVisibilityService } from "../visibility.js";
import {
    isImmutableEntry as immutableEntry,
    isImmutableLayer,
} from "../immutability.js";
import type {
    LibraryAsset,
    LibraryEntry,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
    LibraryEntryInput,
    LibraryEntryFilters,
    LibraryLocation,
    LibraryLookupProvider,
    LibraryLookupSuggestion,
    LibraryMetadata,
    LibraryFormContribution,
    LibraryPushRequest,
    LibraryResolutionProposal,
    LibrarySchema,
    StringLocalizationCapability,
} from "../types.js";
export type {
    LibraryActor,
    LibraryCapability,
    LibraryClassAccess,
    LibraryContentNotifier,
    LibraryProviderCapability,
} from "../contracts.js";
import type {
    LibraryActor,
    LibraryCapability,
    LibraryClassAccess,
    LibraryContentNotifier,
} from "../contracts.js";
export class LibraryService implements LibraryCapability {
    private readonly dictionary: LibraryDictionarySearch;
    private readonly schemas = new Map<string, Map<number, LibrarySchema>>();
    private readonly lookupProviders = new Map<string, LibraryLookupProvider>();
    private readonly formContributions = new Map<
        string,
        LibraryFormContribution
    >();
    private readonly visibility: LibraryVisibilityService;
    constructor(
        private readonly store: LibraryStore,
        private readonly classAccess?: LibraryClassAccess,
        private readonly flow?: FlowApi,
        private readonly log?: (
            level: string,
            message: string,
            meta?: Record<string, unknown>,
        ) => void | Promise<void>,
        private readonly stringLocalization?: StringLocalizationCapability,
        private readonly audioCache?: LibraryAudioCache,
        private readonly notifyNewContent?: LibraryContentNotifier,
        cacheFactory?: ProbeCacheFactory,
    ) {
        this.dictionary = new LibraryDictionarySearch(store, cacheFactory, log);
        this.visibility = new LibraryVisibilityService(
            store,
            this.read.bind(this),
            this.authorize.bind(this),
            async (actor, input, destination, sourceId) => {
                await validateDependencyVisibility(
                    input,
                    destination,
                    (id) => this.read(actor, id),
                    sourceId,
                    this.schema(input.schemaId),
                );
            },
            flow,
            async (input) => {
                try {
                    await notifyNewContent?.(input);
                } catch (error) {
                    await log?.(
                        "error",
                        "Could not notify global Library content.",
                        {
                            component: "study-library",
                            operation: "notify-content",
                            entryCount: input.entryCount,
                            errorName:
                                error instanceof Error ? error.name : "Error",
                        },
                    );
                }
            },
            this.update.bind(this),
        );
    }

    async registerSchema(input: LibrarySchema): Promise<void> {
        const schema = validateLibrarySchema(input);
        this.assertSchemaVersionAvailable(schema);
        await this.store.saveSchema(schema);
        this.rememberSchema(schema);
    }

    private assertSchemaVersionAvailable(schema: LibrarySchema): void {
        const versions = this.schemas.get(schema.id) ?? new Map();
        if (versions.has(schema.version))
            throw new Error("schema_version_registered");
        const newest = Math.max(0, ...versions.keys());
        if (schema.version <= newest)
            throw new Error("schema_version_regression");
    }

    private rememberSchema(schema: LibrarySchema): void {
        const versions = this.schemas.get(schema.id) ?? new Map();
        versions.set(schema.version, schema);
        this.schemas.set(schema.id, versions);
    }

    registerLookupProvider(provider: LibraryLookupProvider): () => void {
        if (
            !provider.id.trim() ||
            !Object.keys(provider.metadata?.labels ?? {}).length ||
            (provider.searchable !== undefined &&
                typeof provider.searchable !== "boolean") ||
            (provider.searchable === true &&
                !provider.capabilities?.includes("dictionary")) ||
            this.lookupProviders.has(provider.id)
        )
            throw new Error("lookup_provider_registered");
        this.lookupProviders.set(provider.id, provider);
        return () => this.lookupProviders.delete(provider.id);
    }

    listLookupProviders(input: {
        schemaId: string;
        schemaVersion?: number;
        layer: string;
    }): Array<{
        id: string;
        metadata: LibraryMetadata;
        fields?: readonly string[];
        capabilities?: readonly ("dictionary" | "strokePattern")[];
        searchable?: boolean;
    }> {
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        return Array.from(this.lookupProviders.values())
            .filter((provider) => provider.supports(schema, layer))
            .map(({ id, metadata, fields, capabilities, searchable }) => ({
                id,
                metadata: structuredClone(metadata),
                ...(searchable === true ? { searchable: true } : {}),
                ...(fields?.length ? { fields: [...fields] } : {}),
                ...(capabilities?.length
                    ? { capabilities: [...capabilities] }
                    : {}),
            }));
    }

    registerFormContribution(
        contribution: LibraryFormContribution,
    ): () => void {
        if (
            !contribution.id.trim() ||
            this.formContributions.has(contribution.id)
        )
            throw new Error("form_contribution_registered");
        const schema = this.schema(contribution.schemaId);
        const layer = findLayer(schema, contribution.layerId);
        const fieldIds = new Set((layer.fields ?? []).map(({ id }) => id));
        if (
            !contribution.cardConstructor &&
            !(contribution.fields?.length ?? 0)
        )
            throw new Error("form_contribution_empty");
        if (contribution.fields?.some(({ id }) => !fieldIds.has(id)))
            throw new Error("form_contribution_field_unknown");
        if (contribution.cardConstructor) {
            validateLibrarySchema({
                ...schema,
                layers: schema.layers.map((item) =>
                    item.id === layer.id
                        ? {
                              ...item,
                              cardConstructor: contribution.cardConstructor,
                          }
                        : item,
                ),
            });
            if (
                Array.from(this.formContributions.values()).some(
                    (registered) =>
                        registered.schemaId === contribution.schemaId &&
                        registered.layerId === contribution.layerId &&
                        registered.cardConstructor,
                )
            )
                throw new Error("constructor_registered");
        }

        this.formContributions.set(
            contribution.id,
            structuredClone(contribution),
        );
        return () => this.formContributions.delete(contribution.id);
    }

    listFormContributions(): LibraryFormContribution[] {
        return this.alignedFormContributions();
    }

    private alignedFormContributions(): LibraryFormContribution[] {
        return alignFormContributions(this.formContributions.values(), (id) =>
            this.schema(id),
        );
    }

    listSchemas(): LibrarySchema[] {
        return Array.from(this.schemas.values(), (versions) =>
            versions.get(Math.max(...versions.keys()))!,
        ).map((schema) => this.schemaWithFormConstructors(schema));
    }

    private schemaWithFormConstructors(schema: LibrarySchema): LibrarySchema {
        return applyFormContributions(schema, this.alignedFormContributions());
    }

    getSchema(id: string, version?: number): LibrarySchema | null {
        const versions = this.schemas.get(id);
        if (!versions) return null;
        const selected = versions.get(version ?? Math.max(...versions.keys()));
        return selected ? structuredClone(selected) : null;
    }

    async locations(actor: LibraryActor, language?: string) {
        const personal = { scope: "user", scopeId: actor.accountId } as const;
        const readable: LibraryLocation[] = [
            { scope: "global", scopeId: "global" },
            personal,
        ];
        const writable: LibraryLocation[] = [personal];
        if (actor.role === "admin" || actor.role === "owner")
            writable.push({ scope: "global", scopeId: "global" });
        for (const classId of (await this.classAccess?.listReadable?.(
            actor.accountId,
            actor.role,
            language,
        )) ?? [])
            readable.push({ scope: "class", scopeId: classId });
        for (const classId of (await this.classAccess?.listWritable?.(
            actor.accountId,
            actor.role,
            language,
        )) ?? [])
            writable.push({ scope: "class", scopeId: classId });
        return { readable, writable };
    }

    async inspectContentPack(root: string): Promise<LibraryContentPackPlan> {
        return inspectContentPack(root);
    }

    async ingestContentPack(root: string): Promise<LibraryContentPackReceipt> {
        try {
            const plan = await inspectContentPack(root);
            const registered = this.getSchema(
                plan.schema.id,
                plan.schema.version,
            );
            if (!registered) {
                this.assertSchemaVersionAvailable(plan.schema);
            }

            await this.flow?.run("study:library:ingest", { plan });
            await storeContentPackAudio(plan, this.audioCache);
            const receipt = await this.store.ingestContentPack(plan);
            if (receipt.newRecordCount > 0)
                await this.notifyNewContent?.({
                    entryCount: receipt.newRecordCount,
                    language: plan.schema.language,
                });
            this.rememberSchema(plan.schema);
            await this.log?.("info", "Ingested Study Library content pack.", {
                component: "study-library",
                operation: "ingest-content-pack",
                packId: receipt.packId,
                publisher: receipt.publisher,
                version: receipt.version,
                recordCount: receipt.recordCount,
                unchanged: receipt.unchanged,
            });
            return receipt;
        } catch (error) {
            await this.log?.("error", "Study Library content pack failed.", {
                component: "study-library",
                operation: "ingest-content-pack",
                root,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async readContentPackAsset(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): Promise<LibraryAsset | null> {
        return this.store.getContentPackAsset(
            publisher,
            packId,
            version,
            assetPath,
        );
    }

    private schema(id: string, version?: number): LibrarySchema {
        const schema = this.getSchema(id, version);
        if (!schema) throw new Error("schema_not_found");
        return schema;
    }

    private async authorize(
        actor: LibraryActor,
        raw: LibraryLocation,
        write: boolean,
    ): Promise<LibraryLocation> {
        const location = normalizeLocation(raw, actor);
        if (location.scope === "global") {
            if (write && actor.role !== "admin" && actor.role !== "owner")
                throw new Error("forbidden");
            return location;
        }

        if (location.scope === "user") {
            if (location.scopeId !== actor.accountId)
                throw new Error("forbidden");
            return location;
        }

        if (!this.classAccess) throw new Error("class_access_unavailable");
        const allowed = write
            ? await this.classAccess.canWrite(
                  location.scopeId!,
                  actor.accountId,
                  actor.role,
              )
            : await this.classAccess.canRead(
                  location.scopeId!,
                  actor.accountId,
                  actor.role,
              );
        if (!allowed) throw new Error("forbidden");
        return location;
    }

    async list(
        actor: LibraryActor,
        raw: LibraryLocation,
        filters: LibraryEntryFilters = {},
    ): Promise<LibraryEntry[]> {
        const location = await this.authorize(actor, raw, false);
        validateEntryFilters(filters);
        if (filters.schemaId) {
            const schema = this.schema(filters.schemaId);
            if (filters.layer) findLayer(schema, filters.layer);
        } else if (filters.layer) {
            throw new Error("schema_required");
        }

        const entries = await this.store.list(location, filters);
        return Promise.all(
            entries.map((entry) => this.entryWithPermissions(actor, entry)),
        );
    }

    private entryWithPermissions(
        actor: LibraryActor,
        entry: LibraryEntry,
    ): Promise<LibraryEntry> {
        return entryPermissions(
            actor,
            entry,
            this.immutable(entry),
            this.classAccess,
        );
    }

    private immutable(entry: LibraryEntry): boolean {
        return immutableEntry(this.getSchema(entry.schemaId), entry);
    }

    async read(
        actor: LibraryActor,
        entryId: string,
    ): Promise<LibraryEntry | null> {
        const entry = await this.store.get(entryId);
        if (!entry) return null;
        await this.authorize(
            actor,
            { scope: entry.scope, scopeId: entry.scopeId },
            false,
        );
        return this.entryWithPermissions(actor, entry);
    }

    async viewedEntryIds(actor: LibraryActor): Promise<string[]> {
        return this.store.viewedEntryIds(actor.accountId);
    }

    async markEntriesViewed(
        actor: LibraryActor,
        entryIds: readonly string[],
    ): Promise<void> {
        const uniqueIds = [...new Set(entryIds)];
        if (!uniqueIds.length || uniqueIds.length > 500)
            throw new Error("invalid_entry_selection");
        for (const entryId of uniqueIds) {
            if (!(await this.read(actor, entryId)))
                throw new Error("not_found");
        }

        await this.store.markEntriesViewed(actor.accountId, uniqueIds);
    }

    async readAudio(
        actor: LibraryActor,
        entryId: string,
        fieldId: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        const layer = findLayer(this.schema(entry.schemaId), entry.layer);
        const field = (layer.fields ?? []).find(({ id }) => id === fieldId);
        const storedAudio = entry.fields?.[fieldId];
        if (
            field?.type !== "audio" ||
            typeof storedAudio !== "string" ||
            !storedAudio.startsWith("file:")
        )
            throw new Error("audio_not_found");
        if (!this.audioCache) throw new Error("file_gateway_unavailable");
        return this.audioCache.readStored(storedAudio.slice("file:".length));
    }

    async resolve(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryResolutionProposal[]> {
        await this.flow?.run("study:library:resolve", input);
        const location = await this.authorize(actor, raw, false);
        const schema = this.schemaWithFormConstructors(
            this.schema(input.schemaId, input.schemaVersion),
        );
        findLayer(schema, input.layer);
        return resolveRelationships(
            schema,
            input.layer,
            input.label,
            await this.store.list(location, { schemaId: schema.id }),
        );
    }

    async localizeDefinition(request: LibraryDefinitionLocalizationRequest) {
        return localizeDefinition(request, this.stringLocalization, this.log);
    }

    async lookup(
        providerId: string,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        > & { refresh?: boolean },
    ): Promise<LibraryLookupSuggestion[]> {
        await this.flow?.run("study:library:lookup", input);
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        const selectedProvider = this.lookupProviders.get(providerId);
        if (!selectedProvider || !selectedProvider.supports(schema, layer))
            throw new Error("lookup_provider_not_found");
        return lookupDictionarySuggestions(
            selectedProvider,
            schema,
            layer,
            input.label,
            input.refresh === true,
        );
    }

    searchableProviders(language?: string) {
        return this.dictionary.providers(
            this.lookupProviders.values(),
            this.listSchemas(),
            language,
        );
    }

    async searchDictionary(input: {
        providerId: string;
        schemaId: string;
        query: string;
    }) {
        const provider = this.lookupProviders.get(input.providerId);
        if (!provider) throw new Error("lookup_provider_not_found");
        const schema = this.schema(input.schemaId);
        await this.flow?.run("study:library:search", input);
        return this.dictionary.search(
            provider,
            schema,
            input.query,
            (layer, label) =>
                this.lookup(provider.id, {
                    schemaId: schema.id,
                    layer,
                    label,
                }),
        );
    }

    async create(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry> {
        if (!input.linkedEntries?.length)
            return this.createEntry(actor, raw, input);
        const location = await this.authorize(actor, raw, true);
        const language = this.schema(input.schemaId).language;
        const result = await this.store.transaction(() =>
            createLinkedEntryGraph(
                input,
                location,
                language,
                (node, id, candidates) =>
                    this.createEntry(actor, location, node, id, candidates),
            ),
        );
        if (location.scope === "global")
            await this.notifyNewContent?.({ entryCount: 1, language });
        return result;
    }

    private async createEntry(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: LibraryEntryInput,
        allocatedId?: string,
        candidates?: Map<string, LibraryEntry>,
    ): Promise<LibraryEntry> {
        const location = await this.authorize(actor, raw, true);
        await this.flow?.run("study:library:create", {
            actor,
            location,
            entry: input,
        });
        const schema = this.schemaWithFormConstructors(
            this.schema(input.schemaId, input.schemaVersion),
        );
        validateEntryInput(input);
        const layer = findLayer(schema, input.layer);
        if (isImmutableLayer(layer)) throw new Error("immutable_layer");
        normalizeEntryClass(input, layer);

        const fields = structuredClone(input.fields ?? {});
        const conflict = await findContentConflict(
            this.store,
            location,
            schema.id,
            input,
        );
        if (conflict) throw new Error(`content_conflict:${conflict.id}`);
        let entryId: string | undefined = allocatedId;
        if (layer.semanticRole === "definition") {
            entryId ??= randomUUID();
            await prepareDefinitionFields(
                layer,
                fields,
                entryId,
                input.definitionLanguages ?? [],
                this.stringLocalization,
            );
        }

        validateEntryFields(schema, input.layer, fields);
        const references = input.references ?? [];
        const targets = await validateDependencyVisibility(
            input,
            location,
            async (id) => candidates?.get(id) ?? (await this.read(actor, id)),
        );
        validateReferences(
            schema,
            input.layer,
            references,
            targets,
            input.referenceGroups,
            fields,
        );
        const created = await this.store.create(
            location,
            {
                ...input,
                definitionLanguages: undefined,
                allowConflict: undefined,
                schemaVersion: schema.version,
                label: input.label.trim(),
                fields,
                references,
            },
            schema.language,
            actor.accountId,
            entryId,
        );
        if (location.scope === "global" && !candidates && !input.hidden)
            await this.notifyNewContent?.({
                entryCount: 1,
                language: schema.language,
            });
        return this.entryWithPermissions(actor, created);
    }

    async update(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry> {
        if (!input.linkedEntries?.length)
            return this.updateEntry(actor, entryId, input);
        const current = await this.read(actor, entryId);
        if (!current || !current.canEdit) throw new Error("forbidden");
        const location = { scope: current.scope, scopeId: current.scopeId };
        return this.store.transaction(() =>
            createLinkedEntryGraph(
                input,
                location,
                current.language,
                (node, id, candidates, root) =>
                    root
                        ? this.updateEntry(actor, id, node, candidates)
                        : this.createEntry(
                              actor,
                              location,
                              node,
                              id,
                              candidates,
                          ),
                entryId,
            ),
        );
    }

    private async updateEntry(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
        candidates?: Map<string, LibraryEntry>,
    ): Promise<LibraryEntry> {
        const current = await this.read(actor, entryId);
        if (!current) throw new Error("entry_not_found");
        if (
            (current.protected || current.editable === false) &&
            actor.role !== "admin" &&
            actor.role !== "owner"
        )
            throw new Error("entry_not_editable");
        await this.authorize(
            actor,
            { scope: current.scope, scopeId: current.scopeId },
            true,
        );
        if (
            input.schemaId !== current.schemaId ||
            input.layer !== current.layer
        )
            throw new Error("entry_identity_immutable");
        validateEntryInput(input);
        const schema = this.schemaWithFormConstructors(
            this.schema(current.schemaId),
        );
        input.schemaVersion = schema.version;
        const layer = findLayer(schema, input.layer);
        if (isImmutableLayer(layer)) throw new Error("immutable_layer");
        normalizeEntryClass(input, layer);

        const fields = structuredClone(input.fields ?? {});
        for (const field of layer.fields ?? []) {
            if (
                field.input?.immutable === true &&
                JSON.stringify(fields[field.id]) !==
                    JSON.stringify(current.fields?.[field.id])
            )
                throw new Error(`field_immutable:${field.id}`);
        }

        if (layer.semanticRole === "definition") {
            const localization = layer.definitionLocalization!;
            fields[localization.stringKeyField] =
                current.fields[localization.stringKeyField];
            const translations = fields[localization.translationsField];
            if (
                !translations ||
                typeof translations !== "object" ||
                Array.isArray(translations) ||
                typeof (translations as Record<string, unknown>).en !==
                    "string" ||
                !(translations as Record<string, string>).en.trim()
            )
                throw new Error("definition_english_required");
        }

        validateEntryFields(schema, input.layer, fields);
        const references = input.references ?? [];
        const targets = await validateDependencyVisibility(
            input,
            { scope: current.scope, scopeId: current.scopeId },
            async (id) => candidates?.get(id) ?? (await this.read(actor, id)),
            entryId,
            schema,
        );
        validateReferences(
            schema,
            input.layer,
            references,
            targets,
            input.referenceGroups,
            fields,
        );
        await validatePendingPublicationEdits(
            await this.store.listPushRequests("pending"),
            current.id,
            input,
            async (id) => candidates?.get(id) ?? (await this.read(actor, id)),
            schema,
        );
        const updated = await this.store.update(
            entryId,
            {
                ...input,
                label: input.label.trim(),
                fields,
                references,
            },
            current.sourceRecordId !== undefined,
        );
        return this.entryWithPermissions(actor, updated);
    }

    async planDeletion(actor: LibraryActor, entryIds: readonly string[]) {
        return planDeletion(
            this.store,
            actor,
            entryIds,
            (entry) => this.immutable(entry),
            (actor, location, write) => this.authorize(actor, location, write),
        );
    }

    async deleteEntries(
        actor: LibraryActor,
        entryIds: readonly string[],
        blacklistContentHashes: boolean,
    ): Promise<readonly string[]> {
        validateEntrySelection(entryIds);
        const pendingSources = new Set(
            ((await this.store.listPushRequests?.("pending")) ?? []).map(
                ({ sourceEntryId }) => sourceEntryId,
            ),
        );
        if (entryIds.some((entryId) => pendingSources.has(entryId)))
            throw new Error("request_pending");
        const deletedEntryIds = await this.store.deleteEntries(
            entryIds,
            actor.accountId,
            blacklistContentHashes,
            async (entries) => {
                await authorizeDeletion(
                    actor,
                    entries,
                    pendingSources,
                    (entry) => this.immutable(entry),
                    (actor, location, write) =>
                        this.authorize(actor, location, write),
                );
                await this.flow?.run("study:library:delete", {
                    actor,
                    entries,
                    blacklistContentHashes,
                });
            },
        );
        await this.log?.("info", "Deleted Study Library entries.", {
            component: "study-library",
            operation: "delete-entries",
            accountId: actor.accountId,
            entryIds: deletedEntryIds,
            blacklistContentHashes,
        });
        return deletedEntryIds;
    }

    async trace(actor: LibraryActor, entryId: string) {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        return traceEntry(
            actor,
            entry,
            this.store,
            this.read.bind(this),
            this.authorize.bind(this),
        );
    }

    requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        return this.visibility.requestPush(actor, entryId, destination);
    }

    async requestUpdate(
        actor: LibraryActor,
        entryId: string,
        proposedEntry: LibraryEntryInput,
    ): Promise<LibraryPushRequest> {
        const current = await this.read(actor, entryId);
        if (!current) throw new Error("entry_not_found");
        if (this.immutable(current)) throw new Error("immutable_layer");
        if (current.scope !== "global" || current.createdBy !== actor.accountId)
            throw new Error("forbidden");
        const targets = await validateDependencyVisibility(
            proposedEntry,
            { scope: current.scope, scopeId: current.scopeId },
            (id) => this.read(actor, id),
            current.id,
            this.schema(current.schemaId),
        );
        validateUpdateProposal(
            current,
            proposedEntry,
            this.schema(current.schemaId),
            targets,
        );
        return this.visibility.requestUpdate(actor, entryId, proposedEntry);
    }

    listPushRequests(
        actor: LibraryActor,
        status?: LibraryPushRequest["status"],
    ): Promise<LibraryPushRequest[]> {
        return this.visibility.listPushRequests(actor, status);
    }

    reviewPush(
        actor: LibraryActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest> {
        return this.visibility.reviewPush(actor, requestId, decision);
    }

    withdrawPush(
        actor: LibraryActor,
        requestId: string,
    ): Promise<LibraryPushRequest> {
        return this.visibility.withdrawPush(actor, requestId);
    }

    async moveToPersonal(
        actor: LibraryActor,
        entryId: string,
    ): Promise<LibraryEntry> {
        const entry = await this.read(actor, entryId);
        if (entry && this.immutable(entry)) throw new Error("immutable_layer");
        return this.entryWithPermissions(
            actor,
            await this.visibility.moveToPersonal(actor, entryId),
        );
    }

    async relocate(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<{ entry: LibraryEntry } | { request: LibraryPushRequest }> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        if (this.immutable(entry)) throw new Error("immutable_layer");
        if (actor.role !== "admin" && actor.role !== "owner")
            return {
                request: await this.requestPush(actor, entryId, destination),
            };
        return {
            entry: await this.entryWithPermissions(
                actor,
                await this.visibility.relocate(actor, entryId, destination),
            ),
        };
    }
}
