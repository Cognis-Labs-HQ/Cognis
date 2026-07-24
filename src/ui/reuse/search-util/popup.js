/**
 * Public global search popup entrypoint.
 *
 * Keep this file small: implementation details live in capability-scoped
 * modules in this directory, with the current popup engine isolated in
 * `engine.js` for follow-up extraction.
 *
 * @module reuse/search-util/popup
 */

export {
    createSearchBar,
    openSearchPopup,
    registerSearchAvenue,
    registerSearchCategory,
    registerSearchIndex,
    search,
} from "./engine.js";
