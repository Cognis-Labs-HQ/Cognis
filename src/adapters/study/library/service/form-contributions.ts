import { findLayer } from "../layers.js";
import type { LibraryFormContribution, LibrarySchema } from "../types.js";

export function alignFormContributions(
    formContributions: Iterable<LibraryFormContribution>,
    getSchema: (id: string) => LibrarySchema,
): LibraryFormContribution[] {
    const contributions = Array.from(formContributions, (contribution) =>
        structuredClone(contribution),
    );
    for (const contribution of contributions) {
        if (!contribution.cardConstructor) continue;
        const schema = getSchema(contribution.schemaId);
        const layer = findLayer(schema, contribution.layerId);
        if (layer.semanticRole !== "compoundWritingUnit") continue;
        const lexicalLayerIds = new Set(
            schema.layers
                .filter(({ semanticRole }) => semanticRole === "lexicalUnit")
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
                        const relationship = (layer.relationships ?? []).find(
                            ({ id }) => id === relationshipId,
                        );
                        return (
                            !relationship ||
                            !replacedTargets.has(relationship.targetLayer) ||
                            pronunciationTargets.has(relationship.targetLayer)
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

export function applyFormContributions(
    schema: LibrarySchema,
    formContributions: LibraryFormContribution[],
): LibrarySchema {
    const copy = structuredClone(schema);
    return {
        ...copy,
        layers: copy.layers.map((layer) => {
            const contributions = formContributions.filter(
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
