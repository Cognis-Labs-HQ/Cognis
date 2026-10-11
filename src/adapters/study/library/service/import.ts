import { randomUUID } from "node:crypto";
import type { FlowApi } from "@cognis/core";
import type { LibraryActor } from "../contracts.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibrarySchema,
    LibraryReferenceInput,
} from "../types.js";
import { runOperation } from "../reuse/operation.js";
import { validateEntryInput, validateEntryFields } from "./input.js";
import { allInputReferences } from "./dependencies.js";
import { findLayer } from "../layers.js";
import { isImmutableLayer } from "../immutability.js";

export interface LibraryImportDocument {
    format: "cognis-library";
    version: 1;
    entries: Array<LibraryEntryInput & { key: string }>;
}

interface ImportNode {
    key: string;
    id: string;
    input: LibraryEntryInput;
}

interface ImportPlan {
    ids: Map<string, string>;
    ordered: ImportNode[];
}

/** Allocate import-local keys and topologically order dependencies before writing any card. */
export function prepareLibraryImport(
    raw: unknown,
    schemaFor: (id: string) => LibrarySchema,
): ImportPlan {
    const document = raw as LibraryImportDocument;
    if (
        !document ||
        document.format !== "cognis-library" ||
        document.version !== 1 ||
        !Array.isArray(document.entries) ||
        !document.entries.length
    )
        throw new Error("invalid_import_document");
    const ids = new Map<string, string>();
    for (const entry of document.entries) {
        if (
            !entry ||
            typeof entry.key !== "string" ||
            !entry.key.trim() ||
            entry.key.length > 500 ||
            ids.has(entry.key) ||
            entry.linkedEntries !== undefined
        )
            throw new Error("invalid_import_key");
        ids.set(entry.key, randomUUID());
    }
    const nodes = document.entries.map((rawEntry) => {
        const { key, ...input } = structuredClone(rawEntry);
        validateEntryInput(input);
        const schema = schemaFor(input.schemaId);
        const layer = findLayer(schema, input.layer);
        if (isImmutableLayer(layer)) throw new Error("immutable_layer");
        input.schemaVersion = schema.version;
        input.fields = {
            ...(layer.cardConstructor?.defaults ?? {}),
            ...(input.fields ?? {}),
        };
        if (layer.semanticRole === "definition" && layer.definitionLocalization)
            input.fields[layer.definitionLocalization.stringKeyField] =
                `${layer.definitionLocalization.stringKeyPrefix}:${ids.get(key)}`;
        validateEntryFields(schema, input.layer, input.fields);
        const resolve = (
            reference: LibraryReferenceInput,
        ): LibraryReferenceInput => ({
            ...reference,
            entryId: ids.get(reference.entryId) ?? reference.entryId,
        });
        const referenceValid = (reference: LibraryReferenceInput) =>
            reference &&
            typeof reference.entryId === "string" &&
            !!reference.entryId &&
            typeof reference.relation === "string" &&
            !!reference.relation;
        if (
            input.references !== undefined &&
            (!Array.isArray(input.references) ||
                !input.references.every(referenceValid))
        )
            throw new Error("invalid_reference");
        if (
            input.referenceGroups !== undefined &&
            (!input.referenceGroups ||
                typeof input.referenceGroups !== "object" ||
                Array.isArray(input.referenceGroups) ||
                Object.entries(input.referenceGroups).some(
                    ([relation, groups]) =>
                        !relation ||
                        !Array.isArray(groups) ||
                        groups.some(
                            (group) =>
                                !Array.isArray(group) ||
                                !group.every(referenceValid),
                        ),
                ))
        )
            throw new Error("invalid_reference_group");
        input.references = input.references?.map(resolve);
        input.referenceGroups = Object.fromEntries(
            Object.entries(input.referenceGroups ?? {}).map(
                ([relation, groups]) => [
                    relation,
                    groups.map((group) => group.map(resolve)),
                ],
            ),
        );
        return { key, id: ids.get(key)!, input };
    });
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const ordered: typeof nodes = [];
    const pending = new Map(byId);
    const done = new Set<string>();
    while (pending.size) {
        const ready = [...pending.values()].filter((node) =>
            allInputReferences(node.input).every(
                (reference) =>
                    !byId.has(reference.entryId) || done.has(reference.entryId),
            ),
        );
        if (!ready.length) throw new Error("import_dependency_cycle");
        const layer = `${ready[0].input.schemaId}:${ready[0].input.layer}`;
        for (const node of ready.filter(
            (node) => `${node.input.schemaId}:${node.input.layer}` === layer,
        )) {
            ordered.push(node);
            done.add(node.id);
            pending.delete(node.id);
        }
    }
    return { ids, ordered };
}

export async function importLibraryBatch(
    actor: LibraryActor,
    location: LibraryLocation,
    document: unknown,
    context: {
        flow?: FlowApi;
        schema(id: string): LibrarySchema;
        transaction<T>(operation: () => Promise<T>): Promise<T>;
        authorize(
            actor: LibraryActor,
            location: LibraryLocation,
            write: boolean,
        ): Promise<LibraryLocation>;
        create(
            input: LibraryEntryInput,
            id: string,
            location: LibraryLocation,
        ): Promise<LibraryEntry>;
        notify?(input: {
            entryCount: number;
            language?: string;
        }): Promise<void>;
    },
): Promise<{ entries: LibraryEntry[]; ids: Record<string, string> }> {
    let destination!: LibraryLocation;
    let plan!: ReturnType<typeof prepareLibraryImport>;
    const entries: LibraryEntry[] = [];
    await context.transaction(() =>
        runOperation(
            context.flow,
            "study:library:import",
            { actor, location },
            {
                authorize: async () => {
                    destination = await context.authorize(
                        actor,
                        location,
                        true,
                    );
                },
                validate: () => {
                    plan = prepareLibraryImport(document, context.schema);
                },
                persist: async () => {
                    for (const node of plan.ordered)
                        entries.push(
                            await context.create(
                                node.input,
                                node.id,
                                destination,
                            ),
                        );
                },
            },
        ),
    );
    if (destination.scope === "global")
        await context.notify?.({
            entryCount: entries.filter((entry) => !entry.hidden).length,
        });
    return { entries, ids: Object.fromEntries(plan.ids) };
}
