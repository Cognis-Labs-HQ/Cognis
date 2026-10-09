import { isDeepStrictEqual } from "node:util";
import type { LibraryStore } from "../store.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
} from "../types.js";

export async function findContentConflict(
    store: LibraryStore,
    location: LibraryLocation,
    schemaId: string,
    input: LibraryEntryInput,
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
                        candidate.references ?? [],
                        input.references ?? [],
                    ) &&
                    isDeepStrictEqual(
                        candidate.referenceGroups ?? {},
                        input.referenceGroups ?? {},
                    ))) &&
            candidate.label.trim().normalize("NFKC").toLocaleLowerCase() ===
                label,
    );
}
