import { isMeaningLayer, layerForEntry } from "./presentation.js";
import { isDirectlyVisible } from "./cards.js";
import { assignVariantPlacements } from "./variant-placement.js";

export function popupEntryNavigationState(
    entries,
    selectedEntry,
    schema,
    layer,
    navigationEntryIds,
) {
    if (navigationEntryIds?.includes(selectedEntry.id)) {
        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        const active = navigationEntryIds
            .map((id) => byId.get(id))
            .filter(Boolean);
        return {
            active,
            index: active.findIndex(({ id }) => id === selectedEntry.id),
        };
    }
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
        const reference = JSON.parse(decodeURIComponent(payload));
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

export function popupNavigationActions(index, count, i18n) {
    return [
        {
            id: "previous",
            label: i18n.t("ui.reuse.previous"),
            icon: {
                light: "/static/assets/reuse/arrow-back-light.svg",
                dark: "/static/assets/reuse/arrow-back-dark.svg",
                position: "before",
            },
            variant: "neutral",
            disabled: index <= 0,
        },
        {
            id: "next",
            label: i18n.t("ui.reuse.next"),
            icon: {
                light: "/static/assets/reuse/arrow-back-light.svg",
                dark: "/static/assets/reuse/arrow-back-dark.svg",
                position: "after",
                flip: true,
            },
            variant: "neutral",
            disabled: index < 0 || index >= count - 1,
        },
    ];
}
