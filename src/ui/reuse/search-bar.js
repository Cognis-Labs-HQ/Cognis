/**
 * Global search popup helpers.
 *
 * Public exports:
 *   openSearchPopup(options) — opens the shared centred search popup.
 *   createSearchBar(options) — returns a navbar search toggle button wrapper.
 *
 * @module reuse/search-bar
 */

const DEBOUNCE_MS = 280;

/**
 * Converts a singular category token into a basic plural form for placeholder
 * text in the search popup.
 *
 * @param {string} category
 * @returns {string}
 */
function pluralizeCategory(category) {
    if (!category) return "";
    if (/(s|x|z|ch|sh)$/i.test(category)) return `${category}es`;
    if (/[aeiou]y$/i.test(category)) return `${category}s`;
    if (/y$/i.test(category)) return `${category.slice(0, -1)}ies`;
    return `${category}s`;
}

/**
 * Resolves the visible search-input placeholder, supporting the
 * `{{category}}` token and a generic fallback when no category is provided.
 *
 * @param {string} rawPlaceholder
 * @param {string} category
 * @returns {string}
 */
function resolvePopupPlaceholder(rawPlaceholder, category) {
    const trimmedCategory = typeof category === "string" ? category.trim() : "";
    const trimmedPlaceholder =
        typeof rawPlaceholder === "string" ? rawPlaceholder.trim() : "";

    if (trimmedPlaceholder) {
        if (trimmedPlaceholder.includes("{{category}}")) {
            return trimmedPlaceholder.replace(
                "{{category}}",
                trimmedCategory || "something",
            );
        }
        return trimmedPlaceholder;
    }

    if (trimmedCategory) {
        return `Search for ${pluralizeCategory(trimmedCategory)}...`;
    }
    return "Search for something...";
}

function filterLocalGroups(localGroups, query) {
    if (!localGroups?.length || !query) return [];
    const lowerQuery = query.toLowerCase();
    return localGroups
        .map((group) => ({
            category: group.category,
            items: (group.items ?? []).filter(
                (item) =>
                    item.label?.toLowerCase().includes(lowerQuery) ||
                    item.id?.toLowerCase().includes(lowerQuery),
            ),
        }))
        .filter((group) => group.items.length > 0);
}

function buildSearchUrl(endpoint, query, typeFilter) {
    const resolvedTypeFilter =
        typeof typeFilter === "string" && typeFilter.trim()
            ? typeFilter.trim()
            : "";
    const connector = endpoint.includes("?") ? "&" : "?";
    const typeFilterParam = resolvedTypeFilter
        ? `&type=${encodeURIComponent(resolvedTypeFilter)}`
        : "";
    return `${endpoint}${connector}q=${encodeURIComponent(query)}${typeFilterParam}`;
}

function renderGroupedResults(
    resultsContainer,
    groups,
    onSelect,
    closeOverlay,
) {
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

function renderFlatResults(
    resultsContainer,
    items,
    noResultsText,
    onSelect,
    closeOverlay,
    multiSelectState,
) {
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
        const itemKey = item.handle ?? item.id ?? item.accountId ?? "";
        const isSelected = multiSelectState?.selected.has(itemKey);

        if (multiSelectState) {
            listItem.className = `search-popup-result search-popup-result--selectable${isSelected ? " search-popup-result--checked" : ""}`;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "search-popup-result-checkbox";
            checkbox.checked = Boolean(isSelected);
            checkbox.dataset.key = itemKey;
            checkbox.setAttribute("aria-hidden", "true");
            checkbox.tabIndex = -1;
            const label = document.createElement("span");
            label.textContent =
                item.label ||
                item.displayName ||
                item.accountId ||
                item.id ||
                "";
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            listItem.addEventListener("mousedown", (event) => {
                event.preventDefault();
                if (multiSelectState.selected.has(itemKey)) {
                    multiSelectState.selected.delete(itemKey);
                    multiSelectState.itemMap.delete(itemKey);
                } else {
                    multiSelectState.selected.add(itemKey);
                    multiSelectState.itemMap.set(itemKey, item);
                }
                multiSelectState.onSelectionChange();
            });
        } else {
            listItem.className = "search-popup-result";
            listItem.textContent =
                item.label ||
                item.displayName ||
                item.accountId ||
                item.id ||
                "";
            listItem.addEventListener("mousedown", (event) => {
                event.preventDefault();
                closeOverlay();
                onSelect(item);
            });
        }

        list.appendChild(listItem);
    }

    resultsContainer.appendChild(list);
}

async function runSearch({
    endpoint,
    query,
    resultsContainer,
    typeFilter,
    localGroups,
    noResultsText,
    onSelect,
    closeOverlay,
    multiSelectState,
}) {
    if (!query) {
        resultsContainer.innerHTML = "";
        return;
    }

    const matchedLocalGroups = filterLocalGroups(localGroups, query);

    try {
        const token = localStorage.getItem("cognis_access_token");
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const response = await fetch(
            buildSearchUrl(endpoint, query, typeFilter),
            {
                credentials: "same-origin",
                headers,
            },
        );

        if (!response.ok) {
            if (matchedLocalGroups.length > 0) {
                renderGroupedResults(
                    resultsContainer,
                    matchedLocalGroups,
                    onSelect,
                    closeOverlay,
                );
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
        const mergedGroups = [...apiGroups, ...matchedLocalGroups];

        if (mergedGroups.length > 0) {
            renderGroupedResults(
                resultsContainer,
                mergedGroups,
                onSelect,
                closeOverlay,
            );
        } else if (flatItems.length > 0) {
            renderFlatResults(
                resultsContainer,
                flatItems,
                noResultsText,
                onSelect,
                closeOverlay,
                multiSelectState,
            );
        } else if (matchedLocalGroups.length === 0) {
            renderFlatResults(
                resultsContainer,
                [],
                noResultsText,
                onSelect,
                closeOverlay,
                multiSelectState,
            );
        }
    } catch {
        if (matchedLocalGroups.length > 0) {
            renderGroupedResults(
                resultsContainer,
                matchedLocalGroups,
                onSelect,
                closeOverlay,
            );
        }
    }
}

export function openSearchPopup({
    endpoint,
    onSelect,
    onSelectMultiple,
    onClose,
    placeholder = "",
    category = "",
    ariaLabel = "Search",
    noResultsText = "No results found.",
    confirmLabel = "Add selected",
    typeFilter = "",
    localGroups = [],
    multiSelect = false,
}) {
    const existingOverlay = document.querySelector(".search-popup-overlay");
    if (existingOverlay) {
        existingOverlay.__closeSearchPopup?.();
    }

    let debounceTimer = null;
    let currentQuery = "";
    const eventController = new AbortController();

    const overlay = document.createElement("div");
    overlay.className = "search-popup-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", ariaLabel);

    const popup = document.createElement("div");
    popup.className = "search-popup";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "search-popup-input";
    input.placeholder = resolvePopupPlaceholder(placeholder, category);
    input.setAttribute("aria-label", ariaLabel);
    input.setAttribute("autocomplete", "off");

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "search-popup-results";

    popup.appendChild(input);
    popup.appendChild(resultsContainer);

    let multiSelectState = null;
    let confirmFooter = null;

    if (multiSelect) {
        confirmFooter = document.createElement("div");
        confirmFooter.className = "search-popup-confirm-footer";
        confirmFooter.hidden = true;

        const confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "search-popup-confirm-btn btn-animated";
        confirmBtn.textContent = confirmLabel;
        confirmFooter.appendChild(confirmBtn);
        popup.appendChild(confirmFooter);

        const updateFooter = () => {
            const count = multiSelectState.selected.size;
            confirmFooter.hidden = count === 0;
            confirmBtn.textContent = `${confirmLabel} (${count})`;

            const allItems = resultsContainer.querySelectorAll(
                ".search-popup-result--selectable",
            );
            for (const item of allItems) {
                const checkbox = item.querySelector(
                    ".search-popup-result-checkbox",
                );
                if (!(checkbox instanceof HTMLInputElement)) continue;
                const key = checkbox.dataset.key ?? "";
                const isChecked = multiSelectState.selected.has(key);
                checkbox.checked = isChecked;
                item.classList.toggle(
                    "search-popup-result--checked",
                    isChecked,
                );
            }
        };

        multiSelectState = {
            selected: new Set(),
            itemMap: new Map(),
            onSelectionChange: updateFooter,
        };

        confirmBtn.addEventListener("mousedown", (event) => {
            event.preventDefault();
            const selectedItems = Array.from(multiSelectState.itemMap.values());
            closeOverlay();
            onSelectMultiple?.(selectedItems);
        });
    }

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const closeOverlay = () => {
        clearTimeout(debounceTimer);
        eventController.abort();
        overlay.remove();
        onClose?.();
    };

    overlay.__closeSearchPopup = closeOverlay;

    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            closeOverlay();
        }
    };

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
            () =>
                runSearch({
                    endpoint,
                    query,
                    resultsContainer,
                    typeFilter,
                    localGroups,
                    noResultsText,
                    onSelect,
                    closeOverlay,
                    multiSelectState,
                }),
            DEBOUNCE_MS,
        );
    });

    overlay.addEventListener(
        "mousedown",
        (event) => {
            if (event.target === overlay) {
                closeOverlay();
            }
        },
        { signal: eventController.signal },
    );

    document.addEventListener("keydown", onKeyDown, {
        signal: eventController.signal,
    });
    requestAnimationFrame(() => input.focus());

    return closeOverlay;
}

export function createSearchBar({
    endpoint,
    onSelect,
    placeholder = "",
    category = "",
    ariaLabel = "Search",
    noResultsText = "No results found.",
    typeFilter = "",
    localGroups = [],
}) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-bar-wrap";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "search-bar-toggle";
    toggleBtn.setAttribute("aria-label", ariaLabel);
    toggleBtn.innerHTML = "&#128269;";
    wrapper.appendChild(toggleBtn);

    let closePopup = null;

    toggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (typeof closePopup === "function") {
            closePopup();
            closePopup = null;
            return;
        }
        closePopup = openSearchPopup({
            endpoint,
            onSelect: (result) => {
                closePopup = null;
                onSelect(result);
            },
            onClose: () => {
                closePopup = null;
            },
            placeholder,
            category,
            ariaLabel,
            noResultsText,
            typeFilter,
            localGroups,
        });
    });

    return wrapper;
}
