function escapeSearchSelectorToken(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function")
        return CSS.escape(value);
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isInternalSearchUrlAccessible(url, isVisibleSearchElement) {
    const rawUrl = String(url ?? "").trim();
    if (!rawUrl) return true;
    try {
        const resolvedUrl = new URL(rawUrl, window.location.origin);
        if (resolvedUrl.origin !== window.location.origin) return false;
        if (
            resolvedUrl.protocol !== "http:" &&
            resolvedUrl.protocol !== "https:"
        )
            return false;
        if (
            resolvedUrl.pathname === window.location.pathname &&
            resolvedUrl.hash
        ) {
            const targetId = decodeURIComponent(resolvedUrl.hash.slice(1));
            const selector = escapeSearchSelectorToken(targetId);
            const target =
                document.getElementById(targetId) ||
                document.querySelector(
                    `[data-search-id="${selector}"], [data-search-anchor="${selector}"]`,
                );
            return target ? isVisibleSearchElement(target) : true;
        }
        return (
            rawUrl.startsWith("/") ||
            resolvedUrl.origin === window.location.origin
        );
    } catch {
        return false;
    }
}

/**
 * Checks whether one search result is accessible and visible.
 * @param {object} item Search result descriptor.
 * @param {(element: Element) => boolean} isVisibleSearchElement Predicate.
 * @returns {boolean} Whether the current user can see the result.
 */
export function isSearchResultVisibleToUser(item, isVisibleSearchElement) {
    if (
        item?.visible === false ||
        item?.isVisible === false ||
        item?.hidden === true ||
        item?.private === true
    )
        return false;
    const itemId = String(item?.id ?? "").trim();
    const selector = escapeSearchSelectorToken(itemId);
    const target = itemId
        ? document.querySelector(
              `[data-search-id="${selector}"], [data-search-anchor="${selector}"], [data-message-id="${selector}"], [data-post-id="${selector}"]`,
          )
        : null;
    if (target && !isVisibleSearchElement(target)) return false;
    return isInternalSearchUrlAccessible(item?.url, isVisibleSearchElement);
}

/**
 * Filters search groups using the supplied DOM visibility predicate.
 * @param {Array<object>} groups Search result groups.
 * @param {(element: Element) => boolean} isVisibleSearchElement Predicate.
 * @returns {Array<object>} Groups containing visible results.
 */
export function filterVisibleSearchGroups(groups, isVisibleSearchElement) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter((item) =>
                isSearchResultVisibleToUser(item, isVisibleSearchElement),
            ),
        }))
        .filter((group) => group.items.length > 0);
}
/**
 * Resolves whether search results and grouped results remain user-visible.
 * Public exports: `isSearchResultVisibleToUser` checks one item;
 * `filterVisibleSearchGroups` filters grouped items.
 * @example `filterVisibleSearchGroups(groups, isVisibleElement)`
 */
