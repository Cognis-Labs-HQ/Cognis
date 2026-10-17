import type { FlowApi } from "@cognis/core";
import { runOperation } from "../reuse/operation.js";
import type { LibraryActor } from "../contracts.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibrarySchema,
    LibraryPushRequest,
} from "../types.js";
import {
    allInputReferences,
    validateDependencyVisibility,
} from "./dependencies.js";
import { createLinkedEntryGraph } from "./linked-entries.js";
import { validateUpdateProposal } from "./proposals.js";
import { validateEntryInput, validateEntryFields } from "./input.js";
import { findLayer, validateReferences } from "../layers.js";
import { isImmutableLayer } from "../immutability.js";

/** Merge additions while retaining the canonical card's input composition and scalar values. */
export function mergeEntryProposal(
    current: LibraryEntry,
    input: LibraryEntryInput,
    schema: LibrarySchema,
): LibraryEntryInput {
    const identity = (label: string) =>
        label.trim().normalize("NFKC").toLocaleLowerCase();
    if (
        input.schemaId !== current.schemaId ||
        input.layer !== current.layer ||
        identity(input.label) !== identity(current.label) ||
        Boolean(input.hidden) !== Boolean(current.hidden)
    )
        throw new Error("entry_identity_immutable");
    const fields = structuredClone(current.fields ?? {});
    for (const [id, value] of Object.entries(input.fields ?? {})) {
        if (fields[id] === undefined || fields[id] === "")
            fields[id] = structuredClone(value);
        else if (Array.isArray(fields[id]) && Array.isArray(value))
            fields[id] = [
                ...new Map(
                    [...(fields[id] as unknown[]), ...value].map((item) => [
                        JSON.stringify(item),
                        item,
                    ]),
                ).values(),
            ];
    }
    const references = structuredClone(current.references ?? []);
    const referenceGroups = structuredClone(current.referenceGroups ?? {});
    const layer = findLayer(schema, current.layer);
    for (const relationship of layer.relationships ?? []) {
        const incoming = structuredClone(input.references ?? []).filter(
            ({ relation }) => relation === relationship.id,
        );
        const existing = references.filter(
            ({ relation }) => relation === relationship.id,
        );
        if (!relationship.ordered && !relationship.grouped) {
            for (const reference of [...existing, ...incoming])
                delete reference.position;
            for (const reference of incoming)
                if (
                    !existing.some(
                        ({ entryId }) => entryId === reference.entryId,
                    )
                ) {
                    references.push(reference);
                    existing.push(reference);
                }
        } else if (
            !existing.length &&
            !referenceGroups[relationship.id]?.length
        )
            references.push(...incoming);
        const groups = input.referenceGroups?.[relationship.id];
        if (!groups) continue;
        const field = layer.fields?.find(
            ({ input }) =>
                input?.linkRelationship === relationship.id ||
                input?.linkRelationships?.includes(relationship.id),
        );
        const before = field ? current.fields?.[field.id] : undefined;
        const added = field ? input.fields?.[field.id] : undefined;
        if (
            Array.isArray(before) &&
            Array.isArray(added) &&
            referenceGroups[relationship.id]?.length
        ) {
            groups.forEach((group, index) => {
                if (!before.includes(added[index]))
                    referenceGroups[relationship.id].push(group);
            });
        } else if (!referenceGroups[relationship.id]?.length)
            referenceGroups[relationship.id] = groups;
    }
    const proposed = {
        ...input,
        label: current.label,
        class: current.class,
        fields,
        references,
        referenceGroups,
        tags: [...new Set([...(current.tags ?? []), ...(input.tags ?? [])])],
        hidden: current.hidden,
        alwaysShowDefinition:
            current.alwaysShowDefinition || input.alwaysShowDefinition,
    };
    const needed = new Set(
        allInputReferences(proposed).map(({ entryId }) => entryId),
    );
    let changed = true;
    while (changed) {
        changed = false;
        for (const { key, entry } of input.linkedEntries ?? []) {
            if (!needed.has(key)) continue;
            for (const { entryId } of allInputReferences(entry)) {
                if (!needed.has(entryId)) {
                    needed.add(entryId);
                    changed = true;
                }
            }
        }
    }
    proposed.linkedEntries = input.linkedEntries?.filter(({ key }) =>
        needed.has(key),
    );
    return proposed;
}

/** Validate a pending merge graph without writing its proposed hidden cards. */
export async function validateMergeProposal(
    actor: LibraryActor,
    current: LibraryEntry,
    proposed: LibraryEntryInput,
    schema: LibrarySchema,
    read: (actor: LibraryActor, id: string) => Promise<LibraryEntry | null>,
): Promise<void> {
    const location = { scope: current.scope, scopeId: current.scopeId };
    await createLinkedEntryGraph(
        proposed,
        location,
        current.language,
        async (node, id, candidates, root) => {
            validateEntryInput(node);
            const layer = findLayer(schema, node.layer);
            if (isImmutableLayer(layer)) throw new Error("immutable_layer");
            const targets = await validateDependencyVisibility(
                node,
                location,
                async (target) =>
                    candidates.get(target) ?? (await read(actor, target)),
                id,
                schema,
            );
            if (root) validateUpdateProposal(current, node, schema, targets);
            else {
                validateEntryFields(schema, node.layer, node.fields ?? {});
                validateReferences(
                    schema,
                    node.layer,
                    node.references ?? [],
                    targets,
                    node.referenceGroups,
                    node.fields ?? {},
                );
            }
            return candidates.get(id)!;
        },
        current.id,
    );
}

interface MergeContext {
    flow?: FlowApi;
    transaction<T>(operation: () => Promise<T>): Promise<T>;
    read(actor: LibraryActor, id: string): Promise<LibraryEntry | null>;
    schema(id: string): LibrarySchema;
    immutable(entry: LibraryEntry): boolean;
    update(
        actor: LibraryActor,
        id: string,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry>;
    request(
        actor: LibraryActor,
        id: string,
        input: LibraryEntryInput,
    ): Promise<LibraryPushRequest>;
}

export async function mergeLibraryDraft(
    actor: LibraryActor,
    entryId: string,
    input: LibraryEntryInput,
    context: MergeContext,
): Promise<{ entry: LibraryEntry; request?: LibraryPushRequest }> {
    return context.transaction(async () => {
        let current: LibraryEntry;
        let proposed: LibraryEntryInput;
        let result: { entry: LibraryEntry; request?: LibraryPushRequest };
        await runOperation(
            context.flow,
            "study:library:merge",
            { actor, entryId, entry: input },
            {
                authorize: async () => {
                    validateEntryInput(input);
                    const entry = await context.read(actor, entryId);
                    if (!entry) throw new Error("entry_not_found");
                    if (context.immutable(entry))
                        throw new Error("immutable_layer");
                    current = entry;
                },
                validate: async () => {
                    const schema = context.schema(current.schemaId);
                    proposed = mergeEntryProposal(current, input, schema);
                    await validateMergeProposal(
                        actor,
                        current,
                        proposed,
                        schema,
                        context.read,
                    );
                },
                merge: async () => {
                    result =
                        actor.role === "admin" ||
                        actor.role === "owner" ||
                        current.scope === "user"
                            ? {
                                  entry: await context.update(
                                      actor,
                                      entryId,
                                      proposed,
                                  ),
                              }
                            : {
                                  entry: current,
                                  request: await context.request(
                                      actor,
                                      entryId,
                                      proposed,
                                  ),
                              };
                },
            },
        );
        return result!;
    });
}
