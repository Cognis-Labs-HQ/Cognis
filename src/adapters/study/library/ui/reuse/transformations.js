function applySuffix(value, operation) {
    if (!operation) return value;
    const selected = {
        ...operation,
        ...operation.suffixes?.find((suffix) =>
            value.endsWith(suffix.removeSuffix),
        ),
    };
    if (
        !value.endsWith(selected.removeSuffix) ||
        !value.startsWith(selected.removePrefix ?? "")
    )
        return null;
    return `${selected.prepend ?? ""}${value.slice((selected.removePrefix ?? "").length, value.length - selected.removeSuffix.length)}${selected.append}`;
}

function effectiveRule(entry, rule) {
    const form =
        rule.forms && Object.hasOwn(rule.forms, entry.label)
            ? rule.forms[entry.label]
            : undefined;
    if (!form) return rule;
    const {
        removeSuffix,
        append,
        prepend,
        removePrefix,
        suffixes,
        ...metadata
    } = rule;
    return { ...metadata, ...form };
}

function eligibleTransformSets(entry, schema) {
    const tags = new Set(entry.tags ?? []);
    return (schema?.transformSets ?? []).filter(
        (set) =>
            typeof set.flag === "string" &&
            tags.has(set.flag) &&
            set.matchTags.every((tag) => tags.has(tag)),
    );
}

function baseNode(entry, set) {
    const pronunciation =
        (Array.isArray(entry.fields?.pronunciation)
            ? entry.fields.pronunciation[0]
            : entry.fields?.pronunciation) ?? entry.label;
    if (typeof pronunciation !== "string")
        throw new Error("invalid_transform_source");
    return {
        class: entry.class,
        state: set.baseState,
        value: entry.label,
        pronunciation,
        depth: 0,
        path: [],
        definitionRules: [],
    };
}

function applyRule(entry, node, declared) {
    if (declared.fromState !== node.state) return null;
    const rule = effectiveRule(entry, declared);
    const value = applySuffix(node.value, rule);
    const pronunciation = applySuffix(node.pronunciation, rule.pronunciation);
    if (value === null || pronunciation === null) return null;
    return {
        class: rule.resultClass ?? node.class,
        state: rule.toState,
        value,
        pronunciation,
        definition: rule.definition,
        depth: node.depth + 1,
        rule,
        definitionRules: [...node.definitionRules, rule],
        path: [...node.path, rule.id],
    };
}

export function transformationPathways(entry, schema) {
    return eligibleTransformSets(entry, schema).map((set) => {
        const nodes = [baseNode(entry, set)];
        const seen = new Set([`${set.baseState}\u0000${entry.label}`]);
        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            for (const declared of set.rules) {
                const next = applyRule(entry, node, declared);
                if (!next) continue;
                const key = `${next.state}\u0000${next.value}`;
                if (seen.has(key)) continue;
                if (node.path.includes(declared.id))
                    throw new Error("cyclic_transform_rules");
                seen.add(key);
                nodes.push({ ...next, parent: index });
            }
        }
        return { set, nodes };
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
    const set = eligibleTransformSets(entry, schema).find(
        ({ id }) => id === transformation?.setId,
    );
    if (
        !set ||
        !Array.isArray(transformation?.path) ||
        !transformation.path.length ||
        transformation.path.length > 8
    )
        return null;
    let node = baseNode(entry, set);
    for (const ruleId of transformation.path) {
        const declared = set.rules.find((candidate) => candidate.id === ruleId);
        if (!declared) return null;
        node = applyRule(entry, node, declared);
        if (!node) return null;
    }
    return { set, node };
}

export function generatedTransformationCard(entry, schema, transformation) {
    if (transformation === undefined) return entry;
    const resolved = referencedTransformation(entry, schema, transformation);
    if (!resolved) throw new Error("invalid_reference_transformation");
    const fields = {
        ...entry.fields,
        pronunciation: [resolved.node.pronunciation],
    };
    for (const field of schema.layers?.find(({ id }) => id === entry.layer)
        ?.fields ?? []) {
        if (["audio", "audioList", "strokePattern"].includes(field.type))
            delete fields[field.id];
    }
    return {
        ...entry,
        label: resolved.node.value,
        class: resolved.node.class,
        fields,
        referenceTransformation: {
            setId: resolved.set.id,
            path: resolved.node.path,
        },
        canEdit: false,
        canDelete: false,
    };
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
        const values = { definition, stem, prefix, suffix };
        return localized(transform.template).replace(
            /\{\{\s*(definition|stem|prefix|suffix)\s*\}\}/giu,
            (_match, key) => values[key.toLowerCase()],
        );
    }, baseDefinition);
}

export function transformedDefinitions(definitions, node, language) {
    return (definitions ?? [])
        .map((definition) => transformedDefinition(definition, node, language))
        .filter(Boolean);
}
