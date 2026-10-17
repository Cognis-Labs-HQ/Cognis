/** Resolve provider layers and canonical Explore routes for every installed language. */
export function exploreLayers(schemas, languageCode) {
    return schemas
        .filter((schema) => !languageCode || schema.language === languageCode)
        .flatMap((schema) =>
            schema.layers
                .filter(
                    (layer) =>
                        !["definition", "meaning", "particle"].includes(
                            layer.semanticRole,
                        ),
                )
                .map((layer) => ({ schema, layer })),
        );
}

export function languageExploreUrl(schemas, languageCode, currentPath = "") {
    const parts = currentPath.split("/").filter(Boolean);
    const current =
        parts[1] === "explore" &&
        exploreLayers(schemas, parts[2]).find(
            ({ layer }) => (layer.navigationSlug ?? layer.id) === parts[3],
        );
    const layers = exploreLayers(schemas, languageCode);
    const selected =
        layers.find(
            ({ layer }) =>
                current && layer.semanticRole === current.layer.semanticRole,
        ) ?? layers[0];
    return selected
        ? `/study/explore/${encodeURIComponent(languageCode)}/${encodeURIComponent(selected.layer.navigationSlug ?? selected.layer.id)}`
        : null;
}

export function languageFlashcardsUrl(languageCode, deckId) {
    if (!languageCode) return "/study/flashcards";
    return `/study/${encodeURIComponent(languageCode)}/flashcards${deckId ? `/${encodeURIComponent(deckId)}` : ""}`;
}

export function entryExploreUrl(entry, schemas) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const candidates = exploreLayers(schema ? [schema] : []);
    const selected =
        candidates.find(({ layer }) => layer.id === entry.layer) ??
        candidates[0];
    return selected
        ? `/study/explore/${encodeURIComponent(schema.language)}/${encodeURIComponent(selected.layer.navigationSlug ?? selected.layer.id)}/${encodeURIComponent(entry.id)}`
        : "";
}
