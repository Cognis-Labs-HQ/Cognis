import type { LibraryActor } from "../contracts.js";
import type { LibraryEntry, LibraryLocation } from "../types.js";
import type { LibraryStore } from "../store.js";
import { allInputReferences } from "./dependencies.js";
export async function traceEntry(
    actor: LibraryActor,
    entry: LibraryEntry,
    store: LibraryStore,
    read: (actor: LibraryActor, id: string) => Promise<LibraryEntry | null>,
    authorize: (
        actor: LibraryActor,
        location: LibraryLocation,
        write: boolean,
    ) => Promise<LibraryLocation>,
): Promise<{
    entry: LibraryEntry;
    references: LibraryEntry[];
    usedBy: LibraryEntry[];
}> {
    const references: LibraryEntry[] = [];
    for (const reference of allInputReferences(entry)) {
        const target = await read(actor, reference.entryId);
        if (target) references.push(target);
    }
    const usedBy: LibraryEntry[] = [];
    const usedByIds = new Set<string>();
    for (const candidate of await store.referencesFor(entry.id)) {
        if (candidate.id === entry.id || usedByIds.has(candidate.id)) continue;
        try {
            await authorize(
                actor,
                { scope: candidate.scope, scopeId: candidate.scopeId },
                false,
            );
            usedBy.push(candidate);
            usedByIds.add(candidate.id);
        } catch (error) {
            if (!(error instanceof Error) || error.message !== "forbidden")
                throw error;
        }
    }
    return {
        entry,
        references,
        usedBy,
    };
}
