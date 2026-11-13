import type { LibraryActor } from "../contracts.js";
import type { LibraryEntry } from "../types.js";
import type { LibraryStore } from "../store.js";
import { allInputReferences } from "./dependencies.js";

export async function traceEntry(
    actor: LibraryActor,
    entry: LibraryEntry,
    store: LibraryStore,
    read: (actor: LibraryActor, id: string) => Promise<LibraryEntry | null>,
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
            const target = await read(actor, candidate.id);
            if (!target) continue;
            usedBy.push(target);
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

export async function markViewedEntries(
    actor: LibraryActor,
    entryIds: readonly string[],
    read: (actor: LibraryActor, id: string) => Promise<LibraryEntry | null>,
    store: {
        markEntriesViewed(accountId: string, ids: string[]): Promise<void>;
    },
): Promise<void> {
    const uniqueIds = [...new Set(entryIds)];
    if (!uniqueIds.length || uniqueIds.length > 500)
        throw new Error("invalid_entry_selection");
    for (const entryId of uniqueIds) {
        if (!(await read(actor, entryId))) throw new Error("not_found");
    }

    await store.markEntriesViewed(actor.accountId, uniqueIds);
}
