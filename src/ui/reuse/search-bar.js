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
 *       endpoint     {string}   Required. API URL prefix; `?q=<query>` is appended.
 *       onSelect     {function} Required. Called with the selected result object.
 *       placeholder  {string}   Input placeholder text.
 *       ariaLabel    {string}   Accessible label for the toggle button.
 *       noResultsText {string}  Text shown when no matches are found.
 *       usersOnly    {boolean}  If true, appends `&type=users` to the request.
 *
 * Usage example:
 *   import { createSearchBar } from '/static/reuse/search-bar.js';
 *   const bar = createSearchBar({
 *     endpoint: '/api/v1/search',
 *     placeholder: 'Search…',
 *     ariaLabel: 'Search',
 *     noResultsText: 'No results found.',
 *     onSelect: (result) => navigateTo(`/profile/${encodeURIComponent(result.handle)}`),
 *   });
 *   document.querySelector('.account-cluster').prepend(bar);
 *
 * @module reuse/search-bar
 */

const DEBOUNCE_MS = 280;

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
 * @returns {HTMLElement}
 */
export function createSearchBar({
    endpoint,
    onSelect,
    placeholder = "",
    ariaLabel = "Search",
    noResultsText = "No results found.",
    usersOnly = false,
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
        try {
            const token = localStorage.getItem("cognis_access_token");
            const headers = token ? { authorization: `Bearer ${token}` } : {};
            const typeParam = usersOnly ? "&type=users" : "";
            const response = await fetch(
                `${endpoint}?q=${encodeURIComponent(query)}${typeParam}`,
                { credentials: "same-origin", headers },
            );
            if (!response.ok) return;
            const payload = await response.json();
            const responseData = payload?.data ?? [];
            if (
                Array.isArray(responseData) &&
                responseData.length > 0 &&
                typeof responseData[0] === "object" &&
                "category" in responseData[0]
            ) {
                renderGroupedResults(resultsContainer, responseData);
            } else {
                renderFlatResults(resultsContainer, responseData);
            }
        } catch {
            // Search failure is silent; results stay hidden.
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
