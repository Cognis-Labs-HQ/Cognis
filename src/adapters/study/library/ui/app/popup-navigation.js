import { isMeaningLayer, layerForEntry } from "./presentation.js";

export function resolvePopupNavigation({
    result,
    relatedEntry,
    entries,
    active,
    index,
    schemas,
    displayedDefinition,
}) {
    if (result?.startsWith("open-title-reference:")) {
        const entryId = result.slice("open-title-reference:".length);
        return {
            entry: entries.find((entry) => entry.id === entryId),
            sourceDefinition: "",
        };
    }
    if (result === "previous")
        return { entry: active[index - 1], sourceDefinition: "" };
    if (result === "next")
        return { entry: active[index + 1], sourceDefinition: "" };
    if (relatedEntry && !isMeaningLayer(layerForEntry(schemas, relatedEntry))) {
        return { entry: relatedEntry, sourceDefinition: displayedDefinition };
    }
    return { entry: null, sourceDefinition: "" };
}
