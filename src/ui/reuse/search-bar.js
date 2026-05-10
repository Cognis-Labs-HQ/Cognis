/**
 * Global search bar widget.
 *
 * Renders a magnifying-glass toggle button in the topbar. Clicking the button
 * opens a centred popup overlay with a search input and grouped results. The
 * overlay closes when the user clicks outside it or presses Escape.
 *
 * Public exports:
 *   createSearchBar(options) — builds and returns the search bar DOM element.
 *     Options:
 *       endpoint      {string}   Required. API URL; `?q=<query>` is appended.
 *       onSelect      {function} Required. Called with the selected result object.
 *       placeholder   {string}   Input placeholder text.
 *       ariaLabel     {string}   Accessible label for the toggle button.
 *       noResultsText {string}   Text shown when no matches are found.
 *       usersOnly     {boolean}  If true, appends `&type=users` to the request.
 *       localGroups   {Array}    Client-side result groups searched without an API
 *                                call. Each entry: `{ category, items: [{id, label, url, ...}] }`.
 *                                Matched against the query string and merged with API results.
 *
 * Usage example:
 *   import { createSearchBar } from '/static/reuse/search-bar.js';
 *   const bar = createSearchBar({
 *     endpoint: '/api/v1/search',
 *     placeholder: 'Search…',
 *     ariaLabel: 'Search',
 *     noResultsText: 'No results found.',
 *     localGroups: [{ category: 'Settings', items: [{ id: 'general', label: 'General', url: '/settings' }] }],
 *     onSelect: (result) => navigateTo(result.url ?? `/profile/${encodeURIComponent(result.handle)}`),
 *   });
 *   document.querySelector('.account-cluster').prepend(bar);
 *
 * @module reuse/search-bar
 */

const DEBOUNCE_MS = 280;

/**
 * Filters localGroups by a query string and returns only groups with matches.
 *
 * @param {Array} localGroups
 * @param {string} query
 * @returns {Array}
 */
function filterLocalGroups(localGroups, query) {
    if (!localGroups?.length || !query) return [];
    const lower = query.toLowerCase();
    return localGroups
        .map((group) => ({
            category: group.category,
            items: (group.items ?? []).filter(
                (item) =>
                    item.label?.toLowerCase().includes(lower) ||
                    item.id?.toLowerCase().includes(lower),
            ),
        }))
        .filter((group) => group.items.length > 0);
}

/**
 * Creates a search bar widget element.
 *
 * @param {object} options
 * @param {string} options.endpoint - API endpoint prefix for search queries.
 * @param {function} options.onSelect - Called with the selected result.
 * @param {string} [options.placeholder] - Input placeholder text.
 * @param {string} [options.ariaLabel] - Accessible label for the toggle button.
 * @param {string} [options.noResultsText] - Text shown when search yields no results.
 * @param {boolean} [options.usersOnly] - If true, adds type=users to queries.
 * @param {Array} [options.localGroups] - Client-side searchable result groups.
 * @returns {HTMLElement}
 */
export function createSearchBar({
    endpoint,
    onSelect,
    placeholder = "",
    ariaLabel = "Search",
    noResultsText = "No results found.",
    usersOnly = false,
    localGroups = [],
}) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-bar-wrap";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "search-bar-toggle";
    toggleBtn.setAttribute("aria-label", ariaLabel);
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.innerHTML = "&#128269;";

    wrapper.appendChild(toggleBtn);

    let overlay = null;
    let debounceTimer = null;
    let currentQuery = "";

    function closeOverlay() {
        if (!overlay) return;
        overlay.remove();
        overlay = null;
        toggleBtn.setAttribute("aria-expanded", "false");
        currentQuery = "";
    }

    function renderGroupedResults(resultsContainer, groups) {
        resultsContainer.innerHTML = "";
        for (const group of groups) {
            if (!group.items?.length) continue;
            const heading = document.createElement("h3");
            heading.className = "search-popup-category";
            heading.textContent = group.category;
            resultsContainer.appendChild(heading);
            const list = document.createElement("ul");
            list.className = "search-popup-result-list";
            for (const item of group.items) {
                const listItem = document.createElement("li");
                listItem.className = "search-popup-result";
                listItem.textContent = item.label || item.id;
                listItem.addEventListener("mousedown", (event) => {
                    event.preventDefault();
                    closeOverlay();
                    onSelect(item);
                });
                list.appendChild(listItem);
            }
            resultsContainer.appendChild(list);
        }
    }

    function renderFlatResults(resultsContainer, items) {
        resultsContainer.innerHTML = "";
        if (!items.length) {
            const empty = document.createElement("p");
            empty.className = "search-popup-no-results";
            empty.textContent = noResultsText;
            resultsContainer.appendChild(empty);
            return;
        }
        const list = document.createElement("ul");
        list.className = "search-popup-result-list";
        for (const item of items) {
            const listItem = document.createElement("li");
            listItem.className = "search-popup-result";
            listItem.textContent = item.displayName
                ? `${item.displayName} (@${item.handle})`
                : item.label || item.id || `@${item.handle}`;
            listItem.addEventListener("mousedown", (event) => {
                event.preventDefault();
                closeOverlay();
                onSelect(item);
            });
            list.appendChild(listItem);
        }
        resultsContainer.appendChild(list);
    }

    async function runSearch(query, resultsContainer) {
        if (!query) {
            resultsContainer.innerHTML = "";
            return;
        }

        const matchedLocalGroups = filterLocalGroups(localGroups, query);

        try {
            const token = localStorage.getItem("cognis_access_token");
            const headers = token ? { authorization: `Bearer ${token}` } : {};
            const typeParam = usersOnly ? "&type=users" : "";
            const response = await fetch(
                `${endpoint}?q=${encodeURIComponent(query)}${typeParam}`,
                { credentials: "same-origin", headers },
            );
            if (!response.ok) {
                if (matchedLocalGroups.length > 0) {
                    renderGroupedResults(resultsContainer, matchedLocalGroups);
                }
                return;
            }
            const payload = await response.json();
            const responseData = payload?.data ?? [];
            const isGrouped =
                Array.isArray(responseData) &&
                responseData.length > 0 &&
                typeof responseData[0] === "object" &&
                "category" in responseData[0];
            const apiGroups = isGrouped ? responseData : [];
            const flatItems = isGrouped ? [] : responseData;
            const merged = [...apiGroups, ...matchedLocalGroups];
            if (merged.length > 0) {
                renderGroupedResults(resultsContainer, merged);
            } else if (flatItems.length > 0) {
                renderFlatResults(resultsContainer, flatItems);
            } else if (matchedLocalGroups.length === 0) {
                renderFlatResults(resultsContainer, []);
            }
        } catch {
            if (matchedLocalGroups.length > 0) {
                renderGroupedResults(resultsContainer, matchedLocalGroups);
            }
            // API search failure is silent when no local results either.
        }
    }

    function openOverlay() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.className = "search-popup-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", ariaLabel);

        const popup = document.createElement("div");
        popup.className = "search-popup";

        const input = document.createElement("input");
        input.type = "search";
        input.className = "search-popup-input";
        input.placeholder = placeholder;
        input.setAttribute("aria-label", ariaLabel);
        input.setAttribute("autocomplete", "off");

        const resultsContainer = document.createElement("div");
        resultsContainer.className = "search-popup-results";

        popup.appendChild(input);
        popup.appendChild(resultsContainer);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        toggleBtn.setAttribute("aria-expanded", "true");
        requestAnimationFrame(() => input.focus());

        input.addEventListener("input", () => {
            const query = input.value.trim();
            if (query === currentQuery) return;
            currentQuery = query;
            clearTimeout(debounceTimer);
            if (!query) {
                resultsContainer.innerHTML = "";
                return;
            }
            debounceTimer = setTimeout(
                () => runSearch(query, resultsContainer),
                DEBOUNCE_MS,
            );
        });

        overlay.addEventListener("mousedown", (event) => {
            if (event.target === overlay) closeOverlay();
        });
    }

    toggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (overlay) {
            closeOverlay();
        } else {
            openOverlay();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && overlay) {
            closeOverlay();
            toggleBtn.focus();
        }
    });

    return wrapper;
}
