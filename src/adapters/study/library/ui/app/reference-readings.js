import { generatedTransformationCard } from "../reuse/transformations.js";

export function orderedReadingReferences(detail, schemas) {
    return (detail.entry.references ?? [])
        .toSorted(
            (left, right) =>
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .flatMap((reference) => {
            const entry = (detail.references ?? []).find(
                ({ id }) => id === reference.entryId,
            );
            if (!entry) return [];
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const role = schema?.layers.find(
                ({ id }) => id === entry.layer,
            )?.semanticRole;
            if (["definition", "meaning"].includes(role)) return [];
            return [
                generatedTransformationCard(
                    entry,
                    schema,
                    reference.transformation,
                ),
            ];
        });
}
