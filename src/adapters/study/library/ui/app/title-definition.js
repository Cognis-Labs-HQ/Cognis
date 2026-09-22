export function titleDefinitionForRole(
    semanticRole,
    suppliedDefinition,
    sourceDefinition = "",
) {
    if (semanticRole !== "lexicalUnit") return suppliedDefinition;
    return suppliedDefinition || sourceDefinition;
}

export function visibleTitleDefinition(
    entryLabel,
    semanticRole,
    suppliedDefinition,
    sourceDefinition = "",
) {
    const definition = titleDefinitionForRole(
        semanticRole,
        suppliedDefinition,
        sourceDefinition,
    );
    return definition.trim().normalize() === entryLabel.trim().normalize()
        ? ""
        : definition;
}

export function orderedDefinitionDisplay(definitions, fallback = "") {
    return {
        titleDefinition: definitions[0] ?? fallback,
        additionalDefinitions: definitions.slice(1),
    };
}
