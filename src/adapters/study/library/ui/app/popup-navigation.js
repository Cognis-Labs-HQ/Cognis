import { isMeaningLayer, layerForEntry } from "./presentation.js";
import { isDirectlyVisible } from "./cards.js";
import { assignVariantPlacements } from "./variant-placement.js";

export function popupEntryNavigationState(
    entries,
    selectedEntry,
    schema,
    layer,
) {
    const layerEntries = entries.filter(
        (entry) =>
            entry.schemaId === selectedEntry.schemaId &&
            entry.layer === selectedEntry.layer,
    );
    const placements = assignVariantPlacements(layerEntries, schema, layer);
    const active = layerEntries.filter(
        (entry) =>
            !placements.has(entry.id) &&
            isDirectlyVisible(entry, layerEntries, placements),
    );
    return {
        active,
        index: active.findIndex(({ id }) => id === selectedEntry.id),
    };
}

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
        const payload = result.slice("open-title-reference:".length);
        let reference = { entryId: payload };
        try {
            reference = JSON.parse(decodeURIComponent(payload));
        } catch {
            // Retain the legacy plain-ID fallback initialized above.
        }
        return {
            entry: entries.find((entry) => entry.id === reference.entryId),
            sourceDefinition: "",
            transformation: reference.transformation,
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
