import { transformationPathways } from "../ui/reuse/transformations.js";
import type { LibraryContentRecord, LibrarySchema } from "../types.js";

type ContentRecord = LibraryContentRecord & { layer: string };

/** Validate materialized forms using the same provider rules as composition. */
export function validateRequiredTransformationCards(
    schema: LibrarySchema,
    records: readonly ContentRecord[],
): void {
    const requiredSets =
        schema.transformSets?.filter((set) => set.requiredCardStates) ?? [];
    if (!requiredSets.length) return;
    const requirementsSchema = { ...schema, transformSets: requiredSets };
    const derivations = new Map<string, ContentRecord[]>();
    const key = (id: string, setId: string, path: readonly string[]) =>
        JSON.stringify([id, setId, path]);
    for (const record of records) {
        if (
            (record.references ?? []).filter(
                (reference) => reference.transformation,
            ).length !== 1
        )
            continue;
        for (const reference of record.references ?? []) {
            if (!reference.transformation) continue;
            const identity = key(
                reference.entryId,
                reference.transformation.setId,
                reference.transformation.path,
            );
            const candidates = derivations.get(identity) ?? [];
            if (!candidates.some((candidate) => candidate.id === record.id))
                candidates.push(record);
            derivations.set(identity, candidates);
        }
    }
    for (const source of records) {
        for (const { set, nodes } of transformationPathways(
            source,
            requirementsSchema,
        )) {
            for (const state of set.requiredCardStates ?? []) {
                const required = nodes.filter(
                    (node) => node.depth > 0 && node.state === state,
                );
                if (!required.length)
                    throw new Error(
                        `unresolved_required_transform:${source.id}:${set.id}:${state}`,
                    );
                for (const node of required) {
                    const candidates = (
                        derivations.get(key(source.id, set.id, node.path)) ?? []
                    ).filter((record) => record.layer === source.layer);
                    if (candidates.length !== 1)
                        throw new Error(
                            `required_transform_card_count:${source.id}:${set.id}:${node.path.join("/")}:${candidates.length}`,
                        );
                    const card = candidates[0];
                    const pronunciation = Array.isArray(
                        card.fields?.pronunciation,
                    )
                        ? card.fields.pronunciation[0]
                        : card.fields?.pronunciation;
                    if (
                        card.label !== node.value ||
                        pronunciation !== node.pronunciation
                    )
                        throw new Error(
                            `required_transform_card_mismatch:${card.id}:${source.id}:${set.id}:${state}`,
                        );
                }
            }
        }
    }
}
