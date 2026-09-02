import type { AccessRole, FlowApi } from "@cognis/core";
import {
    findLayer,
    resolveRelationships,
    validateFields,
    validateLibrarySchema,
    validateReferences,
} from "./layers.js";
import { LibraryStore } from "./store.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibraryLookupProvider,
    LibraryLookupSuggestion,
    LibraryPushRequest,
    LibraryResolutionProposal,
    LibrarySchema,
} from "./types.js";

export interface LibraryActor {
    accountId: string;
    role: AccessRole;
}

export interface LibraryClassAccess {
    canRead(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
    canWrite(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
}

export interface LibraryCapability {
    registerSchema(schema: LibrarySchema): Promise<void>;
    registerLookupProvider(provider: LibraryLookupProvider): () => void;
    listSchemas(): LibrarySchema[];
    getSchema(id: string, version?: number): LibrarySchema | null;
    list(
        actor: LibraryActor,
        location: LibraryLocation,
        filters?: { schemaId?: string; layer?: string },
    ): Promise<LibraryEntry[]>;
    read(actor: LibraryActor, entryId: string): Promise<LibraryEntry | null>;
    create(
        actor: LibraryActor,
        location: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry>;
    resolve(
        actor: LibraryActor,
        location: LibraryLocation,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryResolutionProposal[]>;
    lookup(
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryLookupSuggestion[]>;
    trace(
        actor: LibraryActor,
        entryId: string,
    ): Promise<{
        entry: LibraryEntry;
        references: LibraryEntry[];
        usedBy: LibraryEntry[];
    }>;
    requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest>;
    reviewPush(
        actor: LibraryActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest>;
}

function normalizeLocation(
    location: LibraryLocation,
    actor: LibraryActor,
): LibraryLocation {
    if (location.scope === "global")
        return { scope: "global", scopeId: "global" };
    if (location.scope === "user")
        return { scope: "user", scopeId: location.scopeId ?? actor.accountId };
    if (!location.scopeId?.trim()) throw new Error("class_id_required");
    return { scope: "class", scopeId: location.scopeId.trim() };
}

export class LibraryService implements LibraryCapability {
    private readonly schemas = new Map<string, Map<number, LibrarySchema>>();
    private readonly lookupProviders = new Map<string, LibraryLookupProvider>();

    constructor(
        private readonly store: LibraryStore,
        private readonly classAccess?: LibraryClassAccess,
        private readonly flow?: FlowApi,
    ) {}

    async registerSchema(input: LibrarySchema): Promise<void> {
        const schema = validateLibrarySchema(input);
        const versions = this.schemas.get(schema.id) ?? new Map();
        if (versions.has(schema.version))
            throw new Error("schema_version_registered");
        const newest = Math.max(0, ...versions.keys());
        if (schema.version <= newest)
            throw new Error("schema_version_regression");
        await this.store.saveSchema(schema);
        versions.set(schema.version, schema);
        this.schemas.set(schema.id, versions);
    }

    registerLookupProvider(provider: LibraryLookupProvider): () => void {
        if (!provider.id.trim() || this.lookupProviders.has(provider.id))
            throw new Error("lookup_provider_registered");
        this.lookupProviders.set(provider.id, provider);
        return () => this.lookupProviders.delete(provider.id);
    }

    listSchemas(): LibrarySchema[] {
        return Array.from(this.schemas.values(), (versions) =>
            versions.get(Math.max(...versions.keys()))!,
        ).map(structuredClone);
    }

    getSchema(id: string, version?: number): LibrarySchema | null {
        const versions = this.schemas.get(id);
        if (!versions) return null;
        const selected = versions.get(version ?? Math.max(...versions.keys()));
        return selected ? structuredClone(selected) : null;
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
        return this.store.list(location, filters);
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
        return entry;
    }

    async resolve(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryResolutionProposal[]> {
        await this.flow?.run("study-library-resolve", input);
        const location = await this.authorize(actor, raw, false);
        const schema = this.schema(input.schemaId, input.schemaVersion);
        findLayer(schema, input.layer);
        return resolveRelationships(
            schema,
            input.layer,
            input.label,
            await this.store.list(location, { schemaId: schema.id }),
        );
    }

    async lookup(
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryLookupSuggestion[]> {
        await this.flow?.run("study-library-lookup", input);
        const schema = this.schema(input.schemaId, input.schemaVersion);
        const layer = findLayer(schema, input.layer);
        const suggestions = await Promise.all(
            Array.from(this.lookupProviders.values())
                .filter((provider) => provider.supports(schema, layer))
                .map((provider) =>
                    provider.lookup({ schema, layer, label: input.label }),
                ),
        );
        return suggestions
            .flat()
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
        await this.flow?.run("study-library-create", {
            actor,
            location: raw,
            entry: input,
        });
        const location = await this.authorize(actor, raw, true);
        const schema = this.schema(input.schemaId, input.schemaVersion);
        if (!input.label?.trim() || input.label.length > 500)
            throw new Error("invalid_label");
        const fields = input.fields ?? {};
        if (JSON.stringify(fields).length > 100_000)
            throw new Error("fields_too_large");
        validateFields(schema, input.layer, fields);
        const references = input.references ?? [];
        const targets = new Map<string, LibraryEntry>();
        for (const reference of references) {
            const target = await this.read(actor, reference.entryId);
            if (!target) throw new Error("reference_not_found");
            targets.set(target.id, target);
        }
        validateReferences(schema, input.layer, references, targets);
        return this.store.create(
            location,
            {
                ...input,
                schemaVersion: schema.version,
                label: input.label.trim(),
                fields,
                references,
            },
            schema.language,
            actor.accountId,
        );
    }

    async trace(actor: LibraryActor, entryId: string) {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        const references: LibraryEntry[] = [];
        for (const reference of entry.references ?? []) {
            const target = await this.read(actor, reference.entryId);
            if (target) references.push(target);
        }
        const usedBy = [];
        for (const candidate of await this.store.referencesFor(entryId)) {
            try {
                await this.authorize(
                    actor,
                    { scope: candidate.scope, scopeId: candidate.scopeId },
                    false,
                );
                usedBy.push(candidate);
            } catch (error) {
                if (!(error instanceof Error) || error.message !== "forbidden")
                    throw error;
            }
        }
        return { entry, references, usedBy };
    }

    async requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        if (!(await this.read(actor, entryId))) throw new Error("not_found");
        const normalized = normalizeLocation(destination, actor);
        if (normalized.scope === "user") throw new Error("invalid_destination");
        return this.store.createPush(entryId, normalized, actor.accountId);
    }

    async reviewPush(
        actor: LibraryActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest> {
        const request = await this.store.getPush(requestId);
        if (!request) throw new Error("not_found");
        if (request.status !== "pending") throw new Error("already_reviewed");
        await this.authorize(actor, request.destination, true);
        if (decision === "approved") {
            const copied = new Map<string, string>();
            const visiting = new Set<string>();
            const copyEntry = async (entryId: string): Promise<string> => {
                const existing = copied.get(entryId);
                if (existing) return existing;
                if (visiting.has(entryId))
                    throw new Error("relationship_cycle_copy");
                visiting.add(entryId);
                const source = await this.store.get(entryId);
                if (!source) throw new Error("reference_not_found");
                const references = [];
                for (const reference of source.references ?? []) {
                    references.push({
                        ...reference,
                        entryId: await copyEntry(reference.entryId),
                    });
                }
                const created = await this.store.create(
                    request.destination,
                    { ...source, references },
                    source.language,
                    actor.accountId,
                );
                visiting.delete(entryId);
                copied.set(entryId, created.id);
                return created.id;
            };
            await copyEntry(request.sourceEntryId);
        }
        await this.store.reviewPush(requestId, decision, actor.accountId);
        return { ...request, status: decision };
    }
}
