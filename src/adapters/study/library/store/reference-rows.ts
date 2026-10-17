import type { LibraryEntryInput } from "../types.js";

export function entryReferenceRows(input: LibraryEntryInput) {
    return [
        ...(input.references ?? []).map((reference, index) => ({
            reference,
            groupIndex: -1,
            position: reference.position ?? index,
        })),
        ...Object.entries(input.referenceGroups ?? {}).flatMap(
            ([relation, groups]) =>
                groups.flatMap((group, groupIndex) =>
                    group.map((reference, position) => ({
                        reference: { ...reference, relation },
                        groupIndex,
                        position: reference.position ?? position,
                    })),
                ),
        ),
    ];
}

export function referenceTransformationValue(reference: {
    transformation?: { setId: string; path: string[] };
}) {
    return reference.transformation
        ? JSON.stringify(reference.transformation)
        : null;
}
