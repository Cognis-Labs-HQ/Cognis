import {
    loadPagePreferences,
    savePagePreferences,
} from "/static/reuse/page-preferences.js";

const PREFERENCE_PAGE_ID = "classes-classroom-ui-preferences";

export function normalizeTileLayout(value) {
    return value === "slideshow" ? "slideshow" : "stacked";
}

export async function loadTileLayoutPreference() {
    const storedPreferences = await loadPagePreferences(PREFERENCE_PAGE_ID);
    return normalizeTileLayout(storedPreferences?.tileLayout);
}

export async function saveTileLayoutPreference(tileLayout) {
    await savePagePreferences(PREFERENCE_PAGE_ID, {
        tileLayout: normalizeTileLayout(tileLayout),
    });
}
