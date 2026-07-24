/**
 * Backwards-compatible entrypoint for the shared global search utilities.
 *
 * The implementation lives in capability-scoped files under
 * `reuse/search-util/`; keep importing this module from existing callers.
 *
 * @module reuse/search-bar
 */

export {
    createSearchBar,
    openSearchPopup,
    registerSearchAvenue,
    registerSearchCategory,
    registerSearchIndex,
    search,
} from "./search-util/popup.js";
