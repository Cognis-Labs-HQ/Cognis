import { definitionText, layerForEntry } from "../presentation.js";

export function entryDefinitions(entry, entries, schema) {
    return (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter((candidate) => {
            const candidateLayer = candidate
                ? layerForEntry([schema], candidate)
                : null;
            return ["definition", "meaning"].includes(
                candidateLayer?.semanticRole,
            );
        })
        .map((definition) =>
            definitionText(
                definition,
                layerForEntry([schema], definition),
                document.documentElement.lang,
            ),
        )
        .filter(Boolean);
}

export function entryDefinition(entry, entries, schema) {
    return entryDefinitions(entry, entries, schema)[0] ?? "";
}
