import { referencedTransformation } from "./transformations.js";

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
            const transformation = referencedTransformation(
                entry,
                schema,
                reference.transformation,
            );
            return [
                transformation
                    ? {
                          ...entry,
                          label: transformation.node.value,
                          fields: {
                              ...entry.fields,
                              pronunciation: transformation.node.pronunciation,
                          },
                          referenceTransformation: reference.transformation,
                      }
                    : entry,
            ];
        });
}
