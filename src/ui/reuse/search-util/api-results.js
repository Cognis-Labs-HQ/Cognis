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

export function hasSelectableTarget(item) {
    return Boolean(
        String(item?.url ?? "").trim() ||
        String(item?.handle ?? "").trim() ||
        String(item?.id ?? "").trim() ||
        String(item?.accountId ?? "").trim(),
    );
}

export function filterNavigableGroups(groups) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(hasSelectableTarget),
        }))
        .filter((group) => group.items.length > 0);
}

export function shouldClientFilterApiResults(searchOptions = {}) {
    const options = normalizeSearchOptions(searchOptions);
    return options.wholeWord || options.regex || options.caseSensitive;
}

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
