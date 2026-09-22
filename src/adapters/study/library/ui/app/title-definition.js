export function titleDefinitionForRole(
    semanticRole,
    suppliedDefinition,
    sourceDefinition = "",
) {
    if (semanticRole !== "lexicalUnit") return suppliedDefinition;
    return suppliedDefinition || sourceDefinition;
}
