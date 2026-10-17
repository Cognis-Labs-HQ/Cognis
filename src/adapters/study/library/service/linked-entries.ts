import { randomUUID } from "node:crypto";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
} from "../types.js";

/** Allocate and resolve a scoped graph before passing every node through normal validation. */
export async function createLinkedEntryGraph(
    input: LibraryEntryInput,
    location: LibraryLocation,
    language: string,
    operation: (
        input: LibraryEntryInput,
        id: string,
        candidates: Map<string, LibraryEntry>,
        root: boolean,
    ) => Promise<LibraryEntry>,
    rootId = randomUUID(),
    existing?: (input: LibraryEntryInput) => Promise<LibraryEntry | undefined>,
): Promise<LibraryEntry> {
    const linked = input.linkedEntries ?? [];
    if (!Array.isArray(linked)) throw new Error("invalid_linked_entries");
    const ids = new Map<string, string>([["$root", rootId]]);
    for (const item of linked) {
        if (
            !item ||
            typeof item.key !== "string" ||
            !item.key.trim() ||
            ids.has(item.key) ||
            item.entry?.hidden !== true ||
            item.entry.linkedEntries !== undefined ||
            item.entry.schemaId !== input.schemaId
        )
            throw new Error("invalid_linked_entries");
        ids.set(item.key, randomUUID());
    }
    const resolve = (entry: LibraryEntryInput) => {
        const cloned = structuredClone(entry);
        delete cloned.linkedEntries;
        const reference = (value: { entryId: string }) => ({
            ...value,
            entryId: ids.get(value.entryId) ?? value.entryId,
        });
        cloned.references = cloned.references?.map(reference);
        cloned.referenceGroups = Object.fromEntries(
            Object.entries(cloned.referenceGroups ?? {}).map(
                ([relation, groups]) => [
                    relation,
                    groups.map((group) => group.map(reference)),
                ],
            ),
        );
        return cloned;
    };
    const reused = new Map<string, LibraryEntry>();
    // Resolving a child changes references in its parents; repeat until aliases settle.
    if (existing) {
        for (let pass = 0; pass < linked.length; pass += 1) {
            let changed = false;
            for (const { key, entry } of linked) {
                const match = await existing(resolve(entry));
                if (match && match.id !== ids.get(key)) {
                    ids.set(key, match.id);
                    reused.set(match.id, match);
                    changed = true;
                }
            }
            if (!changed) break;
        }
    }
    const nodes = [
        { id: rootId, input: resolve(input) },
        ...linked.map(({ key, entry }) => ({
            id: ids.get(key)!,
            input: resolve(entry),
        })),
    ];
    const candidates = new Map(
        nodes.map(({ id, input: candidate }) => [
            id,
            { ...candidate, id, ...location, language } as LibraryEntry,
        ]),
    );
    for (const [id, entry] of reused) candidates.set(id, entry);
    const root = await operation(nodes[0].input, rootId, candidates, true);
    const persisted = new Set(reused.keys());
    for (const node of nodes.slice(1)) {
        if (persisted.has(node.id)) continue;
        await operation(node.input, node.id, candidates, false);
        persisted.add(node.id);
    }
    return root;
}
