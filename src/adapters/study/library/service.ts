import type { AccessRole } from "@cognis/core";
import {
    cloneLibraryTemplate,
    inferReferenceLinks,
    isLibraryLayer,
    validateReferenceLayers,
} from "./layers.js";
import { LibraryStore } from "./store.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibraryPushRequest,
    LibraryLayer,
    LibraryTemplate,
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
    readonly layers: readonly string[];
    cloneTemplate(includedLayers: readonly LibraryLayer[]): LibraryTemplate;
    list(
        actor: LibraryActor,
        location: LibraryLocation,
        layer?: string,
    ): Promise<LibraryEntry[]>;
    read(actor: LibraryActor, entryId: string): Promise<LibraryEntry | null>;
    create(
        actor: LibraryActor,
        location: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry>;
    importJson(actor: LibraryActor, document: unknown): Promise<LibraryEntry[]>;
    exportJson(
        actor: LibraryActor,
        location: LibraryLocation,
    ): Promise<Record<string, unknown>>;
    exportAnki(actor: LibraryActor, location: LibraryLocation): Promise<string>;
    trace(
        actor: LibraryActor,
        entryId: string,
    ): Promise<{ entry: LibraryEntry; usedBy: LibraryEntry[] }>;
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
    readonly layers = [
        "alphabet",
        "alt_characters",
        "definitions",
        "words",
        "sentences",
        "exercises",
        "workouts",
        "routines",
        "collections",
    ] as const;

    constructor(
        private readonly store: LibraryStore,
        private readonly classAccess?: LibraryClassAccess,
    ) {}

    cloneTemplate(includedLayers: readonly LibraryLayer[]): LibraryTemplate {
        return cloneLibraryTemplate(includedLayers);
    }

    private async authorize(
        actor: LibraryActor,
        rawLocation: LibraryLocation,
        write: boolean,
    ): Promise<LibraryLocation> {
        const location = normalizeLocation(rawLocation, actor);
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
        rawLocation: LibraryLocation,
        rawLayer?: string,
    ): Promise<LibraryEntry[]> {
        const location = await this.authorize(actor, rawLocation, false);
        if (rawLayer && !isLibraryLayer(rawLayer))
            throw new Error("invalid_layer");
        return this.store.list(location, rawLayer || undefined);
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

    async create(
        actor: LibraryActor,
        rawLocation: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry> {
        const location = await this.authorize(actor, rawLocation, true);
        if (!isLibraryLayer(input.layer)) throw new Error("invalid_layer");
        if (!input.label?.trim() || input.label.length > 500)
            throw new Error("invalid_label");
        const fieldsJson = JSON.stringify(input.fields ?? {});
        if (fieldsJson.length > 100_000) throw new Error("fields_too_large");
        const references = [...(input.references ?? [])];
        if (input.layer === "words" && references.length === 0) {
            const alphabetEntries = await this.store.list(location, "alphabet");
            const alphabetByLabel = new Map(
                alphabetEntries.map((entry) => [
                    entry.label.normalize("NFC"),
                    entry,
                ]),
            );
            for (const symbol of Array.from(input.label.normalize("NFC"))) {
                let alphabetEntry = alphabetByLabel.get(symbol);
                if (!alphabetEntry) {
                    alphabetEntry = await this.store.create(
                        location,
                        {
                            layer: "alphabet",
                            language: input.language,
                            label: symbol,
                        },
                        actor.accountId,
                    );
                    alphabetByLabel.set(symbol, alphabetEntry);
                }
                references.push({
                    entryId: alphabetEntry.id,
                    relation: "contains",
                });
            }
        }
        if (input.layer === "sentences" && references.length === 0) {
            const candidates = new Map<
                LibraryLayer,
                readonly { id: string; label: string }[]
            >();
            for (const layer of ["words", "definitions"] as const) {
                candidates.set(layer, await this.store.list(location, layer));
            }
            references.push(
                ...inferReferenceLinks(input.layer, input.label, candidates),
            );
        }
        const referencedLayers = new Map();
        for (const reference of references) {
            const referencedEntry = await this.read(actor, reference.entryId);
            if (!referencedEntry) throw new Error("reference_not_found");
            referencedLayers.set(reference.entryId, referencedEntry.layer);
        }
        validateReferenceLayers(input.layer, references, referencedLayers);
        return this.store.create(
            location,
            { ...input, label: input.label.trim(), references },
            actor.accountId,
        );
    }

    async importJson(
        actor: LibraryActor,
        document: unknown,
    ): Promise<LibraryEntry[]> {
        if (actor.role !== "admin" && actor.role !== "owner")
            throw new Error("forbidden");
        const entries = (document as { entries?: unknown })?.entries;
        if (!Array.isArray(entries) || entries.length > 10_000)
            throw new Error("invalid_import");
        const created: LibraryEntry[] = [];
        const importedIds = new Map<string, string>();
        for (const rawEntry of entries) {
            if (!rawEntry || typeof rawEntry !== "object")
                throw new Error("invalid_import_entry");
            const input = rawEntry as LibraryEntryInput & { id?: unknown };
            const references = (input.references ?? []).map((reference) => ({
                ...reference,
                entryId:
                    importedIds.get(reference.entryId) ?? reference.entryId,
            }));
            const entry = await this.create(
                actor,
                { scope: "global" },
                { ...input, references },
            );
            created.push(entry);
            if (typeof input.id === "string" && input.id.trim()) {
                importedIds.set(input.id, entry.id);
            }
        }
        return created;
    }

    async exportJson(
        actor: LibraryActor,
        location: LibraryLocation,
    ): Promise<Record<string, unknown>> {
        return {
            schemaVersion: 1,
            layers: this.layers,
            entries: await this.list(actor, location),
        };
    }

    async exportAnki(
        actor: LibraryActor,
        location: LibraryLocation,
    ): Promise<string> {
        const entries = await this.list(actor, location);
        return entries
            .filter(
                (entry) =>
                    entry.layer === "words" || entry.layer === "sentences",
            )
            .map(
                (entry) =>
                    `${entry.label.replaceAll("\t", " ")}\t${String(entry.fields?.definition ?? "").replaceAll("\t", " ")}`,
            )
            .join("\n");
    }

    async trace(
        actor: LibraryActor,
        entryId: string,
    ): Promise<{ entry: LibraryEntry; usedBy: LibraryEntry[] }> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        const candidates = await this.store.referencesFor(entryId);
        const usedBy: LibraryEntry[] = [];
        for (const candidate of candidates) {
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
        return { entry, usedBy };
    }

    async requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        if (entry.layer !== "words" && entry.references?.length === 0)
            throw new Error("references_required");
        const normalizedDestination = normalizeLocation(destination, actor);
        if (normalizedDestination.scope === "user")
            throw new Error("invalid_destination");
        if (normalizedDestination.scope === "class" && this.classAccess) {
            const canRead = await this.classAccess.canRead(
                normalizedDestination.scopeId!,
                actor.accountId,
                actor.role,
            );
            if (!canRead) throw new Error("forbidden");
        }
        return this.store.createPush(
            entryId,
            normalizedDestination,
            actor.accountId,
        );
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
            const copiedIds = new Map<string, string>();
            const copyWithDependencies = async (
                entryId: string,
            ): Promise<string> => {
                const copiedId = copiedIds.get(entryId);
                if (copiedId) return copiedId;
                const source = await this.store.get(entryId);
                if (!source) throw new Error("reference_not_found");
                const references = [];
                for (const reference of source.references ?? []) {
                    references.push({
                        ...reference,
                        entryId: await copyWithDependencies(reference.entryId),
                    });
                }
                const copy = await this.store.create(
                    request.destination,
                    {
                        layer: source.layer,
                        language: source.language,
                        label: source.label,
                        fields: source.fields,
                        references,
                    },
                    actor.accountId,
                );
                copiedIds.set(entryId, copy.id);
                return copy.id;
            };
            await copyWithDependencies(request.sourceEntryId);
        }
        await this.store.reviewPush(requestId, decision, actor.accountId);
        return { ...request, status: decision };
    }
}
