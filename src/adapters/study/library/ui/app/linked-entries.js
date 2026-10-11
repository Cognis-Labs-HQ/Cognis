/** Keep proposed hidden cards only while their aliases are reachable from the root card. */
export function referencedLinkedEntries(root, linkedEntries = []) {
    const references = (entry) => [
        ...(entry.references ?? []),
        ...Object.values(entry.referenceGroups ?? {}).flat(2),
    ];
    const nodes = new Map(linkedEntries.map((node) => [node.key, node]));
    const reachable = new Set();
    const queue = references(root).map(({ entryId }) => entryId);
    for (const key of queue) {
        if (reachable.has(key)) continue;
        reachable.add(key);
        const node = nodes.get(key);
        if (node)
            queue.push(...references(node.entry).map(({ entryId }) => entryId));
    }
    return linkedEntries.filter(({ key }) => reachable.has(key));
}
