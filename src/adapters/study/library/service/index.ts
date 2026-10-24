import {
    availableLocations,
    authorizeLocation,
    entryPermissions,
    cacheClassWriteAccess,
} from "./permissions.js";
import { ContentAvailability } from "./availability.js";
import { LibraryImages } from "./images.js";
import type { LibraryImageStore } from "../image-store.js";
import { createVisibilityService } from "./visibility.js";
import { storeUploadedAudio, validateUploadedAudioFields } from "./uploads.js";
import { readAuthorizedEntryAudio } from "./audio.js";
import { deleteProviderContent } from "./content-cleanup.js";
import { importLibraryBatch } from "./import.js";
import { mergeLibraryDraft, validateMergeProposal } from "./merge.js";
import { runOperation } from "../reuse/operation.js";
import { LibraryEntryWriter } from "./entries.js";
import { createLinkedEntryGraph } from "./linked-entries.js";
import { findContentConflict } from "./content-conflicts.js";
import { ingestProviderContent } from "./content-ingestion.js";
import {
    LibraryDictionarySearch,
    registerLookupProvider,
    listLookupProviders,
    lookupDictionarySuggestions,
} from "./dictionary.js";
import { validateEntryInput, validateEntryFilters } from "./input.js";
import {
    alignFormContributions,
    applyFormContributions,
} from "./form-contributions.js";
import { localizeDefinition } from "./definitions.js";
import type { LibraryDefinitionLocalizationRequest } from "../types.js";
import {
    notifyDeletedEntries,
    authorizeDeletion,
    pendingDeletionEntries,
    planDeletion,
} from "./deletion.js";
import { validateUpdateProposal } from "./proposals.js";
import {
    canComposeAtLocation,
    validateDependencyVisibility,
    validateEntrySelection,
} from "./dependencies.js";
import { markViewedEntries, traceEntry } from "./trace.js";
import type {
    FlowApi,
    ProbeCacheFactory,
    StudyAudioCapability,
} from "@cognis/core";
import { inspectContentPack } from "../content-pack.js";
import {
    findLayer,
    resolveRelationships,
    validateLibrarySchema,
} from "../layers.js";
import { LibraryStore } from "../store.js";
import { LibraryAudioCache } from "../audio-cache.js";
import { LibraryVisibilityService } from "../visibility.js";
import { isImmutableEntry as immutableEntry } from "../immutability.js";
import type {
    LibraryAsset,
    LibraryReferenceInput,
    LibraryEntry,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
    LibraryEntryInput,
    LibraryEntryFilters,
    LibraryLocation,
    LibraryLookupProvider,
    LibraryLookupSuggestion,
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
    private readonly availability: ContentAvailability;
    readonly images: LibraryImages;
    readonly stagePush: LibraryVisibilityService["stagePush"];
    private readonly writer: LibraryEntryWriter;

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
        private readonly notifyDeletion?: (
            entries: readonly LibraryEntry[],
            actor: LibraryActor,
        ) => Promise<void>,
        private readonly audioProvider?: StudyAudioCapability,
        imageStore?: LibraryImageStore,
        notifyRequest?: ConstructorParameters<
            typeof LibraryVisibilityService
        >[8],
        schemaAvailable?: (schema: LibrarySchema) => boolean,
    ) {
        this.availability = new ContentAvailability(schemaAvailable);
        this.writer = new LibraryEntryWriter({
            store,
            flow,
            schema: (id, version) =>
                this.schemaWithFormConstructors(this.schema(id, version)),
            authorize: this.authorize.bind(this),
            read: this.read.bind(this),
            entryWithPermissions: this.entryWithPermissions.bind(this),
            stringLocalization,
            validateAudio: async (actor, schema, layer, fields, previous) => {
                await Promise.all([
                    validateUploadedAudioFields(
                        actor,
                        schema,
                        layer,
                        fields,
                        previous,
                        this.audioCache,
                    ),
                    this.images.validate(
                        actor,
                        schema,
                        layer,
                        fields,
                        previous,
                    ),
                ]);
            },
        });
        this.dictionary = new LibraryDictionarySearch(store, cacheFactory, log);
        this.visibility = createVisibilityService({
            store,
            read: this.read.bind(this),
            authorize: this.authorize.bind(this),
            schema: this.schema.bind(this),
            update: this.update.bind(this),
            flow,
            removeEntries: this.removeEntries.bind(this),
            notifyDeletion: (entries, actor) =>
                notifyDeletedEntries(
                    entries,
                    actor,
                    this.notifyDeletion,
                    this.log,
                ),
            validateImages: (...args) => this.images.validate(...args),
            notifyRequest,
            isAvailable: (entry) =>
                this.availability.allows(this.registeredSchema(entry.schemaId)),
        });
        this.stagePush = this.visibility.stagePush.bind(this.visibility);
        this.images = new LibraryImages({
            files: imageStore,
            isReferenced: (value) => store.hasImageReference(value),
            flow,
            schema: this.schema.bind(this),
            read: this.read.bind(this),
            asset: this.readContentPackAsset.bind(this),
            log,
            readRequest: this.visibility.readRequestEntry.bind(this.visibility),
        });
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
        return registerLookupProvider(this.lookupProviders, provider);
    }

    listLookupProviders(input: {
        schemaId: string;
        schemaVersion?: number;
        layer: string;
    }) {
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        return listLookupProviders(this.lookupProviders, schema, layer);
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
        )
            .filter((schema) => this.availability.allows(schema))
            .map((schema) => this.schemaWithFormConstructors(schema));
    }

    private schemaWithFormConstructors(schema: LibrarySchema): LibrarySchema {
        const result = applyFormContributions(
            schema,
            this.alignedFormContributions(),
        );
        for (const layer of result.layers) {
            if (
                !this.audioProvider?.supports(
                    result.language ?? "",
                    layer.semanticRole ?? "",
                )
            )
                continue;
            layer.fields = (layer.fields ?? []).map((field) =>
                field.type === "audio"
                    ? { ...field, audioLookupAvailable: true }
                    : field,
            );
        }
        return result;
    }

    getSchema(id: string, version?: number): LibrarySchema | null {
        const schema = this.registeredSchema(id, version);
        return schema && this.availability.allows(schema)
            ? structuredClone(schema)
            : null;
    }

    private registeredSchema(
        id: string,
        version?: number,
    ): LibrarySchema | null {
        const versions = this.schemas.get(id);
        if (!versions) return null;
        const selected = versions.get(version ?? Math.max(...versions.keys()));
        return selected ?? null;
    }

    locations(actor: LibraryActor, language?: string) {
        return availableLocations(actor, language, this.classAccess);
    }

    async inspectContentPack(root: string): Promise<LibraryContentPackPlan> {
        return inspectContentPack(root);
    }

    async ingestContentPack(root: string): Promise<LibraryContentPackReceipt> {
        const receipt = await ingestProviderContent(root, {
            store: this.store,
            flow: this.flow,
            log: this.log,
            audioCache: this.audioCache,
            notifyNewContent: this.notifyNewContent,
            getSchema: this.registeredSchema.bind(this),
            assertSchemaVersionAvailable:
                this.assertSchemaVersionAvailable.bind(this),
            rememberSchema: this.rememberSchema.bind(this),
        });
        this.availability.rememberPack(receipt);
        return receipt;
    }

    async deleteContentPack(root: string): Promise<void> {
        const entries = await deleteProviderContent(
            root,
            this.store,
            this.flow,
        );
        const actor = {
            accountId: "content-pack-cleanup",
            role: "admin" as const,
        };
        await notifyDeletedEntries(
            entries,
            actor,
            this.notifyDeletion,
            this.log,
        );
        await this.log?.("info", "Deleted Study Library content pack.", {
            component: "study-library",
            operation: "deleteContentPack",
            entryCount: entries.length,
        });
    }

    async readContentPackAsset(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): Promise<LibraryAsset | null> {
        if (
            !this.availability.allowsPack(publisher, packId, (id) =>
                this.registeredSchema(id),
            )
        )
            return null;
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

    private authorize(
        actor: LibraryActor,
        raw: LibraryLocation,
        write: boolean,
    ) {
        return authorizeLocation(actor, raw, write, this.classAccess);
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
        const classAccess = cacheClassWriteAccess(this.classAccess);
        return Promise.all(
            entries
                .filter((entry) =>
                    this.availability.allows(
                        this.registeredSchema(entry.schemaId),
                    ),
                )
                .map((entry) =>
                    this.entryWithPermissions(actor, entry, classAccess),
                ),
        );
    }

    private entryWithPermissions(
        actor: LibraryActor,
        entry: LibraryEntry,
        classAccess = this.classAccess,
    ): Promise<LibraryEntry> {
        return entryPermissions(
            actor,
            entry,
            this.immutable(entry),
            classAccess,
            this.audioProvider,
            this.registeredSchema(entry.schemaId) ?? undefined,
        );
    }

    private immutable(entry: LibraryEntry): boolean {
        return immutableEntry(
            this.registeredSchema(entry.schemaId) ?? undefined,
            entry,
        );
    }

    async read(
        actor: LibraryActor,
        entryId: string,
    ): Promise<LibraryEntry | null> {
        const entry = await this.store.get(entryId);
        if (
            !entry ||
            !this.availability.allows(this.registeredSchema(entry.schemaId))
        )
            return null;
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
        return markViewedEntries(
            actor,
            entryIds,
            this.read.bind(this),
            this.store,
        );
    }

    async uploadAudio(
        actor: LibraryActor,
        mediaType: string,
        data: Uint8Array,
    ): Promise<{ value: string }> {
        return storeUploadedAudio(actor, mediaType, data, {
            cache: this.audioCache,
            flow: this.flow,
            authorize: this.authorize.bind(this),
            log: this.log,
        });
    }

    async readAudio(
        actor: LibraryActor,
        entryId: string,
        fieldId: string,
        transformation?: LibraryReferenceInput["transformation"],
        refresh = false,
    ): Promise<{ mediaType: string; data: Buffer }> {
        return readAuthorizedEntryAudio(
            { actor, entryId, fieldId, transformation, refresh },
            {
                read: this.read.bind(this),
                schema: (id) => this.schema(id),
                flow: this.flow,
                cache: this.audioCache,
                provider: this.audioProvider,
                store: this.store,
                log: this.log,
            },
        );
    }

    async resolve(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryResolutionProposal[]> {
        const location = await this.authorize(actor, raw, false);
        const schema = this.schemaWithFormConstructors(
            this.schema(input.schemaId, input.schemaVersion),
        );
        findLayer(schema, input.layer);
        let proposals!: ReturnType<typeof resolveRelationships>;
        await runOperation(this.flow, "study:library:resolve", input, {
            propose: async () => {
                proposals = resolveRelationships(
                    schema,
                    input.layer,
                    input.label,
                    await this.store.list(location, { schemaId: schema.id }),
                );
            },
        });
        return proposals;
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
        if (
            !input ||
            typeof input.schemaId !== "string" ||
            typeof input.layer !== "string" ||
            typeof input.label !== "string" ||
            !input.label.trim() ||
            input.label.length > 100
        )
            throw new Error("invalid_lookup_request");
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        const selectedProvider = this.lookupProviders.get(providerId);
        if (!selectedProvider || !selectedProvider.supports(schema, layer))
            throw new Error("lookup_provider_not_found");
        let suggestions!: LibraryLookupSuggestion[];
        await runOperation(this.flow, "study:library:lookup", input, {
            lookup: async () => {
                suggestions = await lookupDictionarySuggestions(
                    selectedProvider,
                    schema,
                    layer,
                    input.label,
                    input.refresh === true,
                );
            },
        });
        return suggestions;
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
        let result!: Awaited<ReturnType<LibraryDictionarySearch["search"]>>;
        await runOperation(this.flow, "study:library:search", input, {
            validate: () => {
                if (
                    typeof input.query !== "string" ||
                    !input.query.trim() ||
                    input.query.length > 100
                )
                    throw new Error("invalid_query");
            },
            search: async () => {
                result = await this.dictionary.search(
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
            },
        });
        return result;
    }

    async importEntries(
        actor: LibraryActor,
        location: LibraryLocation,
        document: unknown,
    ): Promise<{ entries: LibraryEntry[]; ids: Record<string, string> }> {
        return importLibraryBatch(actor, location, document, {
            flow: this.flow,
            schema: (id) => {
                const schema = this.listSchemas().find(
                    (schema) => schema.id === id,
                );
                if (!schema) throw new Error("schema_not_found");
                return schema;
            },
            transaction: this.store.transaction.bind(this.store),
            authorize: this.authorize.bind(this),
            create: (input, id, destination) =>
                this.writer.create(actor, destination, input, id, new Map()),
            notify: this.notifyNewContent,
        });
    }

    async create(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry> {
        validateEntryInput(input);
        if (!input.linkedEntries?.length) {
            const operation = () => this.writer.create(actor, raw, input);
            const result = await (this.store.transaction
                ? this.store.transaction(operation)
                : operation());
            if (result.scope === "global" && !result.hidden)
                await this.notifyNewContent?.({
                    entryCount: 1,
                    language: result.language,
                });
            return result;
        }
        const location = await this.authorize(actor, raw, true);
        const language = this.schema(input.schemaId).language;
        const result = await this.store.transaction(() =>
            createLinkedEntryGraph(
                input,
                location,
                language,
                (node, id, candidates) =>
                    this.writer.create(actor, location, node, id, candidates),
                undefined,
                (node) =>
                    findContentConflict(
                        this.store,
                        location,
                        node.schemaId,
                        node,
                        this.schema(node.schemaId),
                    ),
            ),
        );
        if (location.scope === "global")
            await this.notifyNewContent?.({ entryCount: 1, language });
        return result;
    }

    async update(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry> {
        validateEntryInput(input);
        if (!input.linkedEntries?.length) {
            const operation = () => this.writer.update(actor, entryId, input);
            return this.store.transaction
                ? this.store.transaction(operation)
                : operation();
        }
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
                        ? this.writer.update(actor, id, node, candidates)
                        : this.writer.create(
                              actor,
                              location,
                              node,
                              id,
                              candidates,
                          ),
                entryId,
                (node) =>
                    findContentConflict(
                        this.store,
                        location,
                        node.schemaId,
                        node,
                        this.schema(node.schemaId),
                    ),
            ),
        );
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
        const entries = await this.removeEntries(
            actor,
            entryIds,
            blacklistContentHashes,
        );
        await notifyDeletedEntries(
            entries,
            actor,
            this.notifyDeletion,
            this.log,
        );
        return entries.map(({ id }) => id);
    }

    private async removeEntries(
        actor: LibraryActor,
        entryIds: readonly string[],
        blacklistContentHashes: boolean,
        reviewedRelocation = false,
    ): Promise<LibraryEntry[]> {
        validateEntrySelection(entryIds);
        const pendingSources = pendingDeletionEntries(
            (await this.store.listPushRequests?.("pending")) ?? [],
        );
        if (entryIds.some((entryId) => pendingSources.has(entryId)))
            throw new Error("request_pending");
        let deletedEntries: LibraryEntry[] = [];
        const deletedEntryIds = await this.store.deleteEntries(
            entryIds,
            actor.accountId,
            blacklistContentHashes,
            async (entries) => {
                deletedEntries = [...entries];
                await authorizeDeletion(
                    actor,
                    entries,
                    pendingSources,
                    (entry) => this.immutable(entry),
                    (actor, location, write) =>
                        this.authorize(actor, location, write),
                    reviewedRelocation,
                );
            },
            (entries, remove) =>
                runOperation(
                    this.flow,
                    "study:library:delete",
                    { actor, entries, blacklistContentHashes },
                    { delete: remove },
                ),
        );
        await this.log?.("info", "Deleted Study Library entries.", {
            component: "study-library",
            operation: "delete-entries",
            accountId: actor.accountId,
            entryIds: deletedEntryIds,
            blacklistContentHashes,
        });
        return deletedEntries;
    }

    async trace(actor: LibraryActor, entryId: string) {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        return traceEntry(actor, entry, this.store, this.read.bind(this));
    }

    async requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        const entry = await this.read(actor, entryId);
        if (entry && this.immutable(entry)) throw new Error("immutable_layer");
        return this.visibility.requestPush(actor, entryId, destination);
    }

    async merge(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
    ): Promise<{ entry: LibraryEntry; request?: LibraryPushRequest }> {
        return mergeLibraryDraft(actor, entryId, input, {
            flow: this.flow,
            transaction: this.store.transaction.bind(this.store),
            read: this.read.bind(this),
            schema: this.schema.bind(this),
            immutable: this.immutable.bind(this),
            update: this.update.bind(this),
            request: this.visibility.requestMerge.bind(this.visibility),
        });
    }

    async requestUpdate(
        actor: LibraryActor,
        entryId: string,
        proposedEntry: LibraryEntryInput,
    ): Promise<LibraryPushRequest> {
        const current = await this.read(actor, entryId);
        if (!current) throw new Error("entry_not_found");
        if (this.immutable(current)) throw new Error("immutable_layer");
        if (
            current.scope !== "global" ||
            !(
                current.createdBy === actor.accountId ||
                current.owners?.includes(actor.accountId)
            )
        )
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
    ): Promise<LibraryPushRequest> {
        const entry = await this.read(actor, entryId);
        if (entry && this.immutable(entry)) throw new Error("immutable_layer");
        return this.visibility.moveToPersonal(actor, entryId);
    }

    async relocate(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<{ entry: LibraryEntry } | { request: LibraryPushRequest }> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        if (this.immutable(entry)) throw new Error("immutable_layer");
        if (
            destination.scope === "user" ||
            (actor.role !== "admin" && actor.role !== "owner")
        )
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
