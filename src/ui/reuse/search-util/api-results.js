/**
 * Filters API-backed search results for selection and advanced match options.
 *
 * Public exports:
 * - `hasSelectableTarget` — reports whether a result identifies a target.
 * - `filterNavigableGroups` — removes results without selectable targets.
 * - `shouldClientFilterApiResults` — detects advanced client-side filters.
 * - `filterApiGroupMatches` — applies advanced matching to grouped results.
 * - `filterApiFlatMatches` — applies advanced matching to flat results.
 *
 * @example
 * const groups = filterNavigableGroups(apiGroups);
 * const filtered = filterApiGroupMatches(groups, query, options);
 */
import {
    attachSearchMatch,
    createSearchMatchResolver,
    normalizeSearchItem,
    normalizeSearchOptions,
} from "./matching.js";

/**
 * Determine whether an API result identifies a selectable target.
 * @param {object} item - API search result.
 * @returns {boolean} Whether the result has a target identifier or URL.
 */
export function hasSelectableTarget(item) {
    return Boolean(
        String(item?.url ?? "").trim() ||
        String(item?.handle ?? "").trim() ||
        String(item?.id ?? "").trim() ||
        String(item?.accountId ?? "").trim(),
    );
}

/**
 * Remove groups and items that cannot open or select a target.
 * @param {Array<object>} groups - Grouped API search results.
 * @returns {Array<object>} Groups containing at least one selectable item.
 */
export function filterNavigableGroups(groups) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(hasSelectableTarget),
        }))
        .filter((group) => group.items.length > 0);
}

/**
 * Determine whether advanced options require client-side matching.
 * @param {object} searchOptions - Search matching preferences.
 * @returns {boolean} Whether API results require client-side filtering.
 */
export function shouldClientFilterApiResults(searchOptions = {}) {
    const options = normalizeSearchOptions(searchOptions);
    return options.wholeWord || options.regex || options.caseSensitive;
}

/**
 * Apply advanced matching to grouped API results.
 * @param {Array<object>} groups - Grouped API search results.
 * @param {string} query - Search query.
 * @param {object} searchOptions - Search matching preferences.
 * @returns {Array<object>} Matching groups with match metadata attached.
 */
export function filterApiGroupMatches(groups, query, searchOptions = {}) {
    if (!shouldClientFilterApiResults(searchOptions)) return groups;
    const resolveMatch = createSearchMatchResolver(query, searchOptions);
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? [])
                .map((item) => attachSearchMatch(item, resolveMatch))
                .filter(Boolean),
        }))
        .filter((group) => group.items.length > 0);
}

/**
 * Apply advanced matching to a flat API result list.
 * @param {Array<object>} items - Flat API search results.
 * @param {string} query - Search query.
 * @param {object} searchOptions - Search matching preferences.
 * @returns {Array<object>} Matching items with match metadata attached.
 */
export function filterApiFlatMatches(items, query, searchOptions = {}) {
    if (!shouldClientFilterApiResults(searchOptions)) return items;
    const resolveMatch = createSearchMatchResolver(query, searchOptions);
    return (items ?? [])
        .map((item) =>
            attachSearchMatch(
                normalizeSearchItem(item, item?.category ?? "Search") ?? item,
                resolveMatch,
            ),
        )
        .filter(Boolean);
}
