import { isDeepStrictEqual } from "node:util";
import type { LibraryStore } from "../store.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibrarySchema,
} from "../types.js";

// SQL assigns storage positions even to unordered links; only ordered relationships include them in identity.
function storedReferences(
    references: LibraryEntryInput["references"] = [],
    schema?: LibrarySchema,
    layer?: string,
) {
    const relationships = schema?.layers.find(
        (candidate) => candidate.id === layer,
    )?.relationships;
    return references
        .map((reference) => {
            const value = { ...reference };
            if (
                !relationships ||
                relationships.find(
                    (relationship) => relationship.id === reference.relation,
                )?.ordered
            )
                value.position ??= 0;
            else delete value.position;
            return value;
        })
        .toSorted(
            (left, right) =>
                left.relation.localeCompare(right.relation) ||
                (left.position ?? 0) - (right.position ?? 0) ||
                left.entryId.localeCompare(right.entryId) ||
                JSON.stringify(left.transformation ?? null).localeCompare(
                    JSON.stringify(right.transformation ?? null),
                ),
        );
}

export async function findContentConflict(
    store: LibraryStore,
    location: LibraryLocation,
    schemaId: string,
    input: LibraryEntryInput,
    schema?: LibrarySchema,
): Promise<LibraryEntry | undefined> {
    const locations = [
        location,
        { scope: "global", scopeId: "global" } as const,
    ];
    const candidates = (
        await Promise.all(
            locations.map(
                (candidate) =>
                    store.list?.(candidate, { schemaId, layer: input.layer }) ??
                    Promise.resolve([]),
            ),
        )
    ).flat();
    const label = input.label.trim().normalize("NFKC").toLocaleLowerCase();
    return candidates.find(
        (candidate) =>
            Boolean(candidate.hidden) === Boolean(input.hidden) &&
            (!input.hidden ||
                (candidate.class === input.class &&
                    isDeepStrictEqual(
                        storedReferences(
                            candidate.references,
                            schema,
                            input.layer,
                        ),
                        storedReferences(input.references, schema, input.layer),
                    ) &&
                    isDeepStrictEqual(
                        candidate.referenceGroups ?? {},
                        input.referenceGroups ?? {},
                    ))) &&
            candidate.label.trim().normalize("NFKC").toLocaleLowerCase() ===
                label,
    );
}
