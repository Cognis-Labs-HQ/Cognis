/**
 * Global search popup keyboard and shared state helpers.
 *
 * @module reuse/search-util/state
 */

export const DEBOUNCE_MS = 280;
export const REGISTERED_SEARCH_CATEGORY_HOOKS = new Set();
export const MIN_SEARCH_QUERY_LENGTH = 2;

let activeSearchToggleButton = null;
let searchShortcutBound = false;

export function setActiveSearchToggleButton(button) {
    activeSearchToggleButton = button;
}

function focusOpenSearchInput() {
    const input = document.querySelector(".search-popup-input");
    if (!(input instanceof HTMLInputElement)) return false;
    input.focus();
    input.select();
    return true;
}

export function bindSearchShortcut() {
    if (searchShortcutBound || typeof document === "undefined") return;
    searchShortcutBound = true;
    document.addEventListener("keydown", (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        if (String(event.key ?? "").toLowerCase() !== "f") return;
        event.preventDefault();
        if (focusOpenSearchInput()) return;
        activeSearchToggleButton?.click();
    });
}
