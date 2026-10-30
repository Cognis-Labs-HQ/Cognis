/** Resolve provider-ranked classifications without persisting derived values. */
export function createClassificationResolver(schemas, entries) {
    const schemasById = new Map(schemas.map((schema) => [schema.id, schema]));
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    const cache = new Map();

    function resolve(entry, fieldId, visiting = new Set()) {
        const key = JSON.stringify([entry.id, fieldId]);
        if (cache.has(key)) return cache.get(key);
        if (visiting.has(key)) return undefined;
        const schema = schemasById.get(entry.schemaId);
        const layer = schema?.layers.find(({ id }) => id === entry.layer);
        const field = layer?.fields?.find(({ id }) => id === fieldId);
        const raw = entry.fields?.[fieldId];
        if (!field?.derivation) return raw;
        const { relationships, values, requireAll, transformationValues } =
            field.derivation;
        let hardest = values.indexOf(raw);
        const path = new Set(visiting).add(key);
        let incomplete =
            raw !== undefined && raw !== null && raw !== "" && hardest < 0;
        const references = (entry.references ?? []).filter(({ relation }) =>
            relationships.includes(relation),
        );
        for (const reference of references) {
            const target = entriesById.get(reference.entryId);
            if (!target || target.schemaId !== entry.schemaId) {
                incomplete = true;
                continue;
            }
            const value = resolve(target, fieldId, path);
            if (values.includes(value))
                hardest = Math.max(hardest, values.indexOf(value));
            else incomplete = true;
            if (reference.transformation) {
                const set = schema.transformSets?.find(
                    ({ id }) => id === reference.transformation.setId,
                );
                for (const ruleId of reference.transformation.path) {
                    const rule = set?.rules.find(({ id }) => id === ruleId);
                    const level = rule
                        ? transformationValues?.[ruleId]
                        : undefined;
                    if (values.includes(level))
                        hardest = Math.max(hardest, values.indexOf(level));
                    else incomplete = true;
                }
            }
        }
        const result =
            (requireAll && (incomplete || !references.length)) || hardest < 0
                ? undefined
                : values[hardest];
        cache.set(key, result);
        return result;
    }

    return {
        project(entry) {
            const layer = schemasById
                .get(entry.schemaId)
                ?.layers.find(({ id }) => id === entry.layer);
            const fields = layer?.fields?.filter(
                ({ derivation }) => derivation,
            );
            if (!fields?.length) return entry;
            const projected = { ...entry, fields: { ...entry.fields } };
            for (const field of fields) {
                const value = resolve(entry, field.id);
                if (value === undefined) delete projected.fields[field.id];
                else projected.fields[field.id] = value;
            }
            return projected;
        },
    };
}

/** Only provider-approved, localized tags are learner-facing. */
export function learnerTagMetadata(entry, layer) {
    return (layer?.detail?.tags ?? [])
        .filter(({ value }) => entry.tags?.includes(value))
        .map(({ metadata }) => metadata);
}
