export const LIBRARY_COMPOSER_LIMITS = Object.freeze({
    tags: 8,
    definitions: 10,
    pronunciations: 16,
});

export function composerLimitViolation(form, layer, schema) {
    const tags = form.elements.tags.value.split("\u001f").filter(Boolean);
    if (tags.length > LIBRARY_COMPOSER_LIMITS.tags)
        return ["gateway.study.library_tag_limit", "tags"];

    const pronunciations = String(
        form.elements["field:pronunciation"]?.value ?? "",
    )
        .split(/\r?\n/u)
        .map((value) => value.trim())
        .filter(Boolean);
    if (pronunciations.length > LIBRARY_COMPOSER_LIMITS.pronunciations)
        return ["gateway.study.library_pronunciation_limit", "pronunciations"];

    const definitionCount = (layer.relationships ?? []).reduce(
        (count, relationship) => {
            const targetLayer = schema.layers.find(
                ({ id }) => id === relationship.targetLayer,
            );
            if (targetLayer?.semanticRole !== "definition") return count;
            return (
                count +
                Array.from(
                    form.elements[`relationship:${relationship.id}`]
                        ?.selectedOptions ?? [],
                ).length
            );
        },
        0,
    );
    return definitionCount > LIBRARY_COMPOSER_LIMITS.definitions
        ? ["gateway.study.library_definition_limit", "definitions"]
        : null;
}
