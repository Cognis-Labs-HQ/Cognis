function applySuffix(value, operation) {
    if (!operation || !value.endsWith(operation.removeSuffix)) return value;
    return `${value.slice(0, value.length - operation.removeSuffix.length)}${operation.append}`;
}

export function transformationPathways(entry, schema) {
    const tags = new Set(entry.tags ?? []);
    return (schema?.transformSets ?? []).flatMap((set) => {
        if (!set.matchTags.every((tag) => tags.has(tag))) return [];
        const nodes = [
            {
                state: set.baseState,
                value: entry.label,
                pronunciation:
                    (Array.isArray(entry.fields?.pronunciation)
                        ? entry.fields.pronunciation[0]
                        : entry.fields?.pronunciation) ?? entry.label,
                depth: 0,
                path: [],
            },
        ];
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
                    pronunciation: applySuffix(
                        node.pronunciation,
                        rule.pronunciation,
                    ),
                    definition: rule.definition,
                    depth: node.depth + 1,
                    rule,
                    parent: index,
                    path: [...node.path, rule.id],
                });
            }
        }
        return [{ set, nodes }];
    });
}

export function matchingTransformation(entry, schema, text) {
    return transformationPathways(entry, schema)
        .flatMap(({ set, nodes }) => nodes.map((node) => ({ set, node })))
        .filter(({ node }) => node.depth > 0 && text.includes(node.value))
        .toSorted(
            (left, right) => right.node.value.length - left.node.value.length,
        )[0];
}

export function transformedDefinition(baseDefinition, node, language) {
    const localized = (metadata) => {
        if (typeof metadata === "string") return metadata;
        const labels = metadata?.labels ?? {};
        const activeLanguage =
            globalThis.document?.documentElement?.lang || language;
        return (
            labels[activeLanguage] ??
            labels[activeLanguage?.split("-")[0]] ??
            labels[language] ??
            labels[language?.split("-")[0]] ??
            Object.values(labels)[0]
        );
    };
    const marker = localized(node.rule?.marker);
    if (marker && baseDefinition) {
        if (/\{\{\s*marker\s*\}\}/iu.test(baseDefinition))
            return baseDefinition.replace(
                /\{\{\s*marker\s*\}\}/giu,
                `(${marker})`,
            );
        if (/^to\s+/iu.test(baseDefinition))
            return baseDefinition.replace(/^to\s+/iu, `to (${marker}) `);
        return `(${marker}) ${baseDefinition}`;
    }
    return localized(node.definition) || baseDefinition;
}

export function transformedDefinitions(definitions, node, language) {
    return (definitions ?? [])
        .map((definition) => transformedDefinition(definition, node, language))
        .filter(Boolean);
}
