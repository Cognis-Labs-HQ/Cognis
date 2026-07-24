/**
 * Backwards-compatible entrypoint for shared search indexing helpers.
 *
 * Capability-scoped implementation lives in `reuse/search-util/indexing.js`.
 *
 * @module reuse/search-index
 */

export {
    createUserContentSearchItem,
    highlightSearchTarget,
    htmlToSearchEntries,
    htmlToSearchSegments,
    htmlToSearchText,
    renderSearchDataAttributes,
} from "./search-util/indexing.js";
