/**
 * Global search bar widget.
 *
 * Renders a magnifying-glass icon in the topbar that expands leftward into a
 * text input on activation. Results are fetched from a configurable API
 * endpoint and displayed in a dropdown below the bar. The caller supplies an
 * `onSelect` callback that receives the chosen result object.
 *
 * Public exports:
 *   createSearchBar(options) — builds and returns the search bar DOM element.
 *     Options:
 *       endpoint   {string}   Required. API URL prefix; `?q=<query>` is appended.
 *       onSelect   {function} Required. Called with the selected result object.
 *       placeholder {string}  Input placeholder text.
 *       ariaLabel  {string}   Accessible label for the toggle button.
 *       noResultsText {string} Text shown when no matches are found.
 *       filterFn   {function} Optional. Post-fetch client-side filter on results array.
 *
 * Usage example:
 *   import { createSearchBar } from '/static/reuse/search-bar.js';
 *   const bar = createSearchBar({
 *     endpoint: '/api/v1/users/search',
 *     placeholder: 'Search users…',
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
 * @param {function} [options.filterFn] - Optional filter applied to API results.
 * @returns {HTMLElement}
 */
export function createSearchBar({
    endpoint,
    onSelect,
    placeholder = "",
    ariaLabel = "Search",
    noResultsText = "No results found.",
    filterFn = null,
}) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-bar-wrap";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "search-bar-toggle";
    toggleBtn.setAttribute("aria-label", ariaLabel);
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.innerHTML = "&#128269;";

    const form = document.createElement("div");
    form.className = "search-bar-form";
    form.hidden = true;

    const input = document.createElement("input");
    input.type = "search";
    input.className = "search-bar-input";
    input.placeholder = placeholder;
    input.setAttribute("aria-label", ariaLabel);
    input.setAttribute("autocomplete", "off");

    const results = document.createElement("ul");
    results.className = "search-bar-results";
    results.hidden = true;
    results.setAttribute("role", "listbox");

    form.appendChild(input);
    form.appendChild(results);
    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(form);

    let expanded = false;
    let debounceTimer = null;
    let currentQuery = "";

    function open() {
        expanded = true;
        form.hidden = false;
        toggleBtn.setAttribute("aria-expanded", "true");
        requestAnimationFrame(() => input.focus());
    }

    function close() {
        expanded = false;
        form.hidden = true;
        toggleBtn.setAttribute("aria-expanded", "false");
        results.hidden = true;
        results.innerHTML = "";
        input.value = "";
        currentQuery = "";
    }

    toggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (expanded) {
            close();
        } else {
            open();
        }
    });

    document.addEventListener("click", (event) => {
        if (expanded && !wrapper.contains(event.target)) {
            close();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && expanded) {
            close();
            toggleBtn.focus();
        }
    });

    function renderResults(items) {
        results.innerHTML = "";
        if (!items.length) {
            const empty = document.createElement("li");
            empty.className = "search-bar-no-results";
            empty.textContent = noResultsText;
            results.appendChild(empty);
            results.hidden = false;
            return;
        }
        for (const item of items) {
            const option = document.createElement("li");
            option.className = "search-bar-result";
            option.setAttribute("role", "option");
            option.textContent = item.displayName
                ? `${item.displayName} (@${item.handle})`
                : `@${item.handle}`;
            option.addEventListener("mousedown", (event) => {
                event.preventDefault();
                close();
                onSelect(item);
            });
            results.appendChild(option);
        }
        results.hidden = false;
    }

    async function runSearch(query) {
        if (!query) {
            results.hidden = true;
            results.innerHTML = "";
            return;
        }
        try {
            const token = localStorage.getItem("cognis_access_token");
            const headers = token ? { authorization: `Bearer ${token}` } : {};
            const response = await fetch(
                `${endpoint}?q=${encodeURIComponent(query)}`,
                { credentials: "same-origin", headers },
            );
            if (!response.ok) return;
            const payload = await response.json();
            let items = payload?.data ?? [];
            if (filterFn) items = filterFn(items);
            renderResults(items);
        } catch {
            // Search failure is silent; results stay hidden.
        }
    }

    input.addEventListener("input", () => {
        const query = input.value.trim();
        if (query === currentQuery) return;
        currentQuery = query;
        clearTimeout(debounceTimer);
        if (!query) {
            results.hidden = true;
            results.innerHTML = "";
            return;
        }
        debounceTimer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    });

    return wrapper;
}
