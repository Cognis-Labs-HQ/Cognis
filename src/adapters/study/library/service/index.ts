import { localizeDefinition } from "./definitions.js";
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
import type { FlowApi } from "@cognis/core";
import { createHash, randomUUID } from "node:crypto";
import { canonicalizeLanguageTag } from "../language.js";
import { inspectContentPack } from "../content-pack.js";
import {
    findLayer,
    resolveRelationships,
    validateFields,
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
const CONTENT_CLASS_PATTERN = /^[a-z][a-zA-Z0-9]*(?::[a-z][a-zA-Z0-9]*)*$/;
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
    ) {
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
                );
            },
            flow,
            notifyNewContent,
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
    }> {
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        return Array.from(this.lookupProviders.values())
            .filter((provider) => provider.supports(schema, layer))
            .map(({ id, metadata, fields, capabilities }) => ({
                id,
                metadata: structuredClone(metadata),
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
        const contributions = Array.from(
            this.formContributions.values(),
            (contribution) => structuredClone(contribution),
        );
        for (const contribution of contributions) {
            if (!contribution.cardConstructor) continue;
            const schema = this.schema(contribution.schemaId);
            const layer = findLayer(schema, contribution.layerId);
            if (layer.semanticRole !== "compoundWritingUnit") continue;
            const lexicalLayerIds = new Set(
                schema.layers
                    .filter(
                        ({ semanticRole }) => semanticRole === "lexicalUnit",
                    )
                    .map(({ id }) => id),
            );
            const lexicalConstructor = contributions.find(
                (candidate) =>
                    candidate.schemaId === contribution.schemaId &&
                    lexicalLayerIds.has(candidate.layerId) &&
                    candidate.cardConstructor,
            )?.cardConstructor;
            if (lexicalConstructor) {
                const pronunciationTargets = new Set(
                    lexicalConstructor.pronunciation_carousels,
                );
                const replacedTargets = new Set(
                    contribution.cardConstructor.pronunciation_carousels,
                );
                const relationships = new Set(
                    (contribution.cardConstructor.relationships ?? []).filter(
                        (relationshipId) => {
                            const relationship = (
                                layer.relationships ?? []
                            ).find(({ id }) => id === relationshipId);
                            return (
                                !relationship ||
                                !replacedTargets.has(
                                    relationship.targetLayer,
                                ) ||
                                pronunciationTargets.has(
                                    relationship.targetLayer,
                                )
                            );
                        },
                    ),
                );
                for (const relationship of layer.relationships ?? []) {
                    if (pronunciationTargets.has(relationship.targetLayer))
                        relationships.add(relationship.id);
                }
                contribution.cardConstructor = {
                    ...contribution.cardConstructor,
                    relationships: [...relationships],
                    pronunciation_carousels: [
                        ...lexicalConstructor.pronunciation_carousels,
                    ],
                };
            }
        }
        return contributions;
    }
    listSchemas(): LibrarySchema[] {
        return Array.from(this.schemas.values(), (versions) =>
            versions.get(Math.max(...versions.keys()))!,
        ).map((schema) => this.schemaWithFormConstructors(schema));
    }
    private schemaWithFormConstructors(schema: LibrarySchema): LibrarySchema {
        const copy = structuredClone(schema);
        return {
            ...copy,
            layers: copy.layers.map((layer) => {
                const contributions = this.alignedFormContributions().filter(
                    (candidate) =>
                        candidate.schemaId === copy.id &&
                        candidate.layerId === layer.id,
                );
                const contributedFields = new Map(
                    contributions
                        .flatMap(({ fields }) => fields ?? [])
                        .map((field) => [field.id, field]),
                );
                const fields = (layer.fields ?? []).map(
                    (field) => contributedFields.get(field.id) ?? field,
                );
                for (const [fieldId, field] of contributedFields) {
                    if (!fields.some(({ id }) => id === fieldId))
                        fields.push(field);
                }
                const cardConstructor = contributions.find(
                    (contribution) => contribution.cardConstructor,
                )?.cardConstructor;
                return {
                    ...layer,
                    fields,
                    ...(cardConstructor ? { cardConstructor } : {}),
                };
            }),
        };
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
            await this.storeContentPackAudio(plan);
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
    private async storeContentPackAudio(
        plan: LibraryContentPackPlan,
    ): Promise<void> {
        if (!this.audioCache) throw new Error("file_gateway_unavailable");
        const audioPaths = new Set<string>();
        for (const record of plan.records) {
            const layer = plan.schema.layers.find(
                ({ id }) => id === record.layer,
            )!;
            const fields = { ...(record.fields ?? {}) };
            for (const field of layer.fields ?? []) {
                const value = fields[field.id];
                if (field.type !== "audio" && field.type !== "audioList")
                    continue;
                const values = Array.isArray(value) ? value : [value];
                const stored = [];
                for (const audioPath of values) {
                    if (typeof audioPath !== "string") {
                        stored.push(audioPath);
                        continue;
                    }
                    const asset = plan.assets.find(
                        ({ path }) => path === audioPath,
                    );
                    if (!asset || !asset.mediaType.startsWith("audio/"))
                        throw new Error("audio_asset_not_found");
                    const key = `packs/${createHash("sha256")
                        .update(
                            `${plan.manifest.publisher}:${plan.manifest.id}:${plan.manifest.version}:${audioPath}`,
                        )
                        .digest("hex")}.audio`;
                    await this.audioCache.store(
                        key,
                        asset.mediaType,
                        Buffer.from(asset.data, "base64"),
                    );
                    stored.push(`file:${key}`);
                    audioPaths.add(audioPath);
                }
                fields[field.id] = Array.isArray(value) ? stored : stored[0];
            }
            record.fields = fields;
        }
        plan.assets = plan.assets.filter(({ path }) => !audioPaths.has(path));
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
        filters: { schemaId?: string; layer?: string } = {},
    ): Promise<LibraryEntry[]> {
        const location = await this.authorize(actor, raw, false);
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
        >,
    ): Promise<LibraryLookupSuggestion[]> {
        await this.flow?.run("study:library:lookup", input);
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        const selectedProvider = this.lookupProviders.get(providerId);
        if (!selectedProvider || !selectedProvider.supports(schema, layer))
            throw new Error("lookup_provider_not_found");
        const suggestions = await Promise.all(
            [selectedProvider].map((provider) =>
                provider.lookup({ schema, layer, label: input.label }),
            ),
        );
        return suggestions
            .flat()
            .map((suggestion) => ({
                ...suggestion,
                provider: suggestion.provider?.trim() || selectedProvider.id,
                provenance:
                    suggestion.provenance?.trim() || selectedProvider.id,
                confidence: Number.isFinite(suggestion.confidence)
                    ? suggestion.confidence
                    : 1,
            }))
            .filter(
                (suggestion) =>
                    suggestion.provider.trim() &&
                    suggestion.provenance.trim() &&
                    Number.isFinite(suggestion.confidence) &&
                    suggestion.confidence >= 0 &&
                    suggestion.confidence <= 1,
            )
            .sort((left, right) => right.confidence - left.confidence);
    }
    async create(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: LibraryEntryInput,
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
        if (!input.label?.trim() || input.label.length > 500)
            throw new Error("invalid_label");
        if (
            input.class !== undefined &&
            !CONTENT_CLASS_PATTERN.test(input.class)
        )
            throw new Error("invalid_content_class");
        if (
            input.tags !== undefined &&
            (!Array.isArray(input.tags) ||
                input.tags.some(
                    (tag) =>
                        typeof tag !== "string" ||
                        !tag.trim() ||
                        tag.length > 50,
                ) ||
                input.tags.length > 25)
        )
            throw new Error("invalid_tags");
        if (input.hidden !== undefined && typeof input.hidden !== "boolean")
            throw new Error("invalid_hidden");
        if (
            input.alwaysShowDefinition !== undefined &&
            typeof input.alwaysShowDefinition !== "boolean"
        )
            throw new Error("invalid_always_show_definition");
        const layer = findLayer(schema, input.layer);
        if (isImmutableLayer(layer)) throw new Error("immutable_layer");
        if (layer.semanticRole === "definition") {
            input.hidden = true;
            input.class = "definition";
        } else if (layer.semanticRole === "orderedLexicalSequence") {
            input.class = layer.id;
        }
        const fields = structuredClone(input.fields ?? {});
        const candidateLocations = [
            location,
            { scope: "global", scopeId: "global" } as const,
        ];
        const visibleCandidates = (
            await Promise.all(
                candidateLocations.map(
                    (candidateLocation) =>
                        this.store.list?.(candidateLocation, {
                            schemaId: schema.id,
                            layer: input.layer,
                        }) ?? Promise.resolve([]),
                ),
            )
        ).flat();
        const normalizedInput = input.label
            .trim()
            .normalize("NFKC")
            .toLocaleLowerCase();
        const conflict = visibleCandidates.find(
            (candidate) =>
                candidate.label.trim().normalize("NFKC").toLocaleLowerCase() ===
                normalizedInput,
        );
        if (conflict) throw new Error(`content_conflict:${conflict.id}`);
        let entryId: string | undefined;
        if (layer.semanticRole === "definition") {
            const localization = layer.definitionLocalization!;
            const translations = fields[localization.translationsField];
            if (
                !translations ||
                typeof translations !== "object" ||
                Array.isArray(translations) ||
                typeof (translations as Record<string, unknown>).en !==
                    "string" ||
                !(translations as Record<string, string>).en.trim()
            ) {
                throw new Error("definition_english_required");
            }
            entryId = randomUUID();
            const stringKey = `${localization.stringKeyPrefix}:${entryId}`;
            fields[localization.stringKeyField] = stringKey;
            if (this.stringLocalization) {
                const localized = translations as Record<string, string>;
                for (const requestedLanguage of input.definitionLanguages ??
                    []) {
                    const targetLanguage =
                        canonicalizeLanguageTag(requestedLanguage);
                    if (localized[targetLanguage]?.trim()) continue;
                    const translated = await this.stringLocalization.translate({
                        stringKey,
                        sourceText: localized.en.trim(),
                        sourceLanguage: "en",
                        targetLanguage,
                    });
                    if (translated?.trim())
                        localized[targetLanguage] = translated.trim();
                }
            }
        }
        if (JSON.stringify(fields).length > 100_000)
            throw new Error("fields_too_large");
        validateFields(schema, input.layer, fields);
        const references = input.references ?? [];
        const targets = await validateDependencyVisibility(
            input,
            location,
            (id) => this.read(actor, id),
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
        if (location.scope === "global")
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
        if (!input.label?.trim() || input.label.length > 500)
            throw new Error("invalid_label");
        if (
            input.class !== undefined &&
            !CONTENT_CLASS_PATTERN.test(input.class)
        )
            throw new Error("invalid_content_class");
        if (
            input.tags !== undefined &&
            (!Array.isArray(input.tags) ||
                input.tags.some(
                    (tag) =>
                        typeof tag !== "string" ||
                        !tag.trim() ||
                        tag.length > 50,
                ) ||
                input.tags.length > 25)
        )
            throw new Error("invalid_tags");
        if (input.hidden !== undefined && typeof input.hidden !== "boolean")
            throw new Error("invalid_hidden");
        if (
            input.alwaysShowDefinition !== undefined &&
            typeof input.alwaysShowDefinition !== "boolean"
        )
            throw new Error("invalid_always_show_definition");
        const schema = this.schemaWithFormConstructors(
            this.schema(current.schemaId),
        );
        input.schemaVersion = schema.version;
        const layer = findLayer(schema, input.layer);
        if (isImmutableLayer(layer)) throw new Error("immutable_layer");
        if (layer.semanticRole === "definition") {
            input.hidden = true;
            input.class = "definition";
        } else if (layer.semanticRole === "orderedLexicalSequence") {
            input.class = layer.id;
        }
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
        if (JSON.stringify(fields).length > 100_000)
            throw new Error("fields_too_large");
        validateFields(schema, input.layer, fields);
        const references = input.references ?? [];
        const targets = await validateDependencyVisibility(
            input,
            { scope: current.scope, scopeId: current.scopeId },
            (id) => this.read(actor, id),
            entryId,
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
            (id) => this.read(actor, id),
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
        );
        validateUpdateProposal(
            current,
            proposedEntry,
            this.schema(current.schemaId),
            targets,
        );
        return this.visibility.requestUpdate(actor, entryId, proposedEntry);
    }
    listPushRequests(actor: LibraryActor): Promise<LibraryPushRequest[]> {
        return this.visibility.listPushRequests(actor);
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
        return this.visibility.moveToPersonal(actor, entryId);
    }
}
