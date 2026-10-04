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
                    definitionRules: [...(node.definitionRules ?? []), rule],
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

export function referencedTransformation(entry, schema, transformation) {
    if (!transformation) return null;
    return (
        transformationPathways(entry, schema)
            .filter(({ set }) => set.id === transformation.setId)
            .flatMap(({ set, nodes }) => nodes.map((node) => ({ set, node })))
            .find(
                ({ node }) =>
                    JSON.stringify(node.path) ===
                    JSON.stringify(transformation.path),
            ) ?? null
    );
}

export function referenceMatchesTransformation(reference, transformation) {
    if (!transformation) return true;
    const setId = transformation.setId ?? transformation.set?.id;
    const path = transformation.path ?? transformation.node?.path;
    const referencePath = reference?.transformation?.path;
    return (
        reference?.transformation?.setId === setId &&
        Array.isArray(referencePath) &&
        Array.isArray(path) &&
        referencePath.length === path.length &&
        referencePath.every((ruleId, index) => ruleId === path[index])
    );
}

export function dependantsMatchingTransformation(
    entries,
    targetEntryId,
    transformation,
) {
    if (!transformation) return entries;
    return entries.filter((entry) =>
        (entry.references ?? []).some(
            (reference) =>
                reference.entryId === targetEntryId &&
                referenceMatchesTransformation(reference, transformation),
        ),
    );
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
    return (node.definitionRules ?? [node.rule]).reduce((definition, rule) => {
        const transform = rule?.definitionTransform;
        if (!transform) return localized(rule?.definition) || definition;
        for (const replacement of transform.replacements ?? []) {
            const match = localized(replacement.match);
            if (!match || !definition.includes(match)) continue;
            return definition.replaceAll(
                match,
                localized(replacement.replacement),
            );
        }
        const prefix = localized(transform.matchPrefix) ?? "";
        const suffix = localized(transform.matchSuffix) ?? "";
        if (
            (prefix && !definition.startsWith(prefix)) ||
            (suffix && !definition.endsWith(suffix))
        )
            return definition;
        const stem = definition.slice(
            prefix.length,
            suffix ? -suffix.length : undefined,
        );
        if (!transform.template) return definition;
        return localized(transform.template)
            .replace(/\{\{\s*definition\s*\}\}/giu, definition)
            .replace(/\{\{\s*stem\s*\}\}/giu, stem)
            .replace(/\{\{\s*prefix\s*\}\}/giu, prefix)
            .replace(/\{\{\s*suffix\s*\}\}/giu, suffix);
    }, baseDefinition);
}

export function transformedDefinitions(definitions, node, language) {
    return (definitions ?? [])
        .map((definition) => transformedDefinition(definition, node, language))
        .filter(Boolean);
}
