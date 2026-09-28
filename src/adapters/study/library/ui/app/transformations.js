export function transformationPathways(entry, schema) {
    const tags = new Set(entry.tags ?? []);
    return (schema.transformSets ?? []).flatMap((set) => {
        if (!set.matchTags.every((tag) => tags.has(tag))) return [];
        const nodes = [{ state: set.baseState, value: entry.label, depth: 0 }];
        const seen = new Set([`${set.baseState}\u0000${entry.label}`]);
        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            for (const rule of set.rules) {
                if (
                    rule.fromState !== node.state ||
                    !node.value.endsWith(rule.removeSuffix)
                ) {
                    continue;
                }
                const value = `${node.value.slice(
                    0,
                    node.value.length - rule.removeSuffix.length,
                )}${rule.append}`;
                const key = `${rule.toState}\u0000${value}`;
                if (seen.has(key)) continue;
                seen.add(key);
                nodes.push({
                    state: rule.toState,
                    value,
                    depth: node.depth + 1,
                    rule,
                    parent: index,
                });
            }
        }
        return [{ set, nodes }];
    });
}
