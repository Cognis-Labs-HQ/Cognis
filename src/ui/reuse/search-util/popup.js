/**
 * Global search popup public API and overlay orchestration.
 *
 * Public exports:
 *   openSearchPopup(options) — opens the shared centred search popup.
 *   createSearchBar(options) — returns a navbar search toggle button wrapper.
 *   registerSearchAvenue(componentId, avenue) — registers one isolated component avenue.
 *   registerSearchCategory(categoryId, provider) — registers dynamic grouped results.
 *   registerSearchIndex(categoryId, provider) — registers component-owned content indexes.
 *   search — ctx-backed search capability with component avenues.
 *
 * @module reuse/search-util/popup
 */

import { uiCtx } from "../ui-ctx.js";
import { search } from "./capability.js";
import {
    DEBOUNCE_MS,
    MIN_SEARCH_QUERY_LENGTH,
    REGISTERED_SEARCH_CATEGORY_HOOKS,
    bindSearchShortcut,
    setActiveSearchToggleButton,
} from "./state.js";
import {
    buildSearchUrl,
    collectBrowserPreferenceSearchGroups,
    collectGlobalDocsSearchGroups,
    collectGlobalSettingsSearchGroups,
    collectVisibleNavigationSearchGroups,
    collectVisiblePageSearchGroups,
    collectVisiblePostSearchGroups,
    filterApiFlatMatches,
    filterLocalGroupsIncrementally,
    filterApiGroupMatches,
    filterNavigableGroups,
    filterSearchGroupsForQuery,
    filterVisibleSearchGroups,
    hasSelectableTarget,
    isSearchResultVisibleToUser,
    mergeSearchGroups,
    normalizeSearchGroup,
    normalizeSearchOptions,
    resolvePopupPlaceholder,
    shouldClientFilterApiResults,
} from "./matching.js";
import {
    clearPageFindHighlights,
    filterGroupsBySelectedCategories,
    getCategoryFilterState,
    movePageFindMatch,
    renderFlatResults,
    renderGroupedResults,
    renderPageFindHighlights,
    renderResultCategorySummary,
    renderSearchPendingMessage,
    setCurrentPageFindMatch,
    updatePageFindCounter,
} from "./results.js";

export { search } from "./capability.js";

let latestSearchRunId = 0;

async function runSearch({
    endpoint,
    query,
    resultsContainer,
    categoriesContainer,
    typeFilter,
    localGroups,
    noResultsText,
    onSelect,
    closeOverlay,
    multiSelectState,
    searchOptions,
}) {
    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
        renderSearchPendingMessage(resultsContainer, categoriesContainer);
        return;
    }

    const searchRunId = ++latestSearchRunId;
    const isMultiSelect = Boolean(multiSelectState);
    let localComplete = false;
    let apiComplete = false;
    let navigableLocalGroups = [];
    let navigableApiGroups = [];
    let flatItems = [];

    const isCurrentRun = () => searchRunId === latestSearchRunId;
    const renderAvailableResults = () => {
        if (!isCurrentRun()) return;
        const mergedGroups = mergeSearchGroups([
            ...navigableApiGroups,
            ...navigableLocalGroups,
        ]);
        if (mergedGroups.length > 0) {
            renderGroupedResults(
                resultsContainer,
                mergedGroups,
                onSelect,
                closeOverlay,
                categoriesContainer,
            );
            return;
        }
        if (flatItems.length > 0) {
            renderFlatResults(
                resultsContainer,
                flatItems,
                noResultsText,
                onSelect,
                closeOverlay,
                multiSelectState,
                categoriesContainer,
            );
            return;
        }
        if (localComplete && apiComplete) {
            renderFlatResults(
                resultsContainer,
                [],
                noResultsText,
                onSelect,
                closeOverlay,
                multiSelectState,
                categoriesContainer,
            );
        }
    };

    filterLocalGroupsIncrementally(
        localGroups,
        query,
        searchOptions,
        (matchedLocalGroups) => {
            navigableLocalGroups = mergeSearchGroups([
                ...navigableLocalGroups,
                ...(isMultiSelect
                    ? matchedLocalGroups
                    : filterNavigableGroups(matchedLocalGroups)),
            ]);
            renderAvailableResults();
        },
    )
        .catch(() => {
            navigableLocalGroups = [];
        })
        .finally(() => {
            localComplete = true;
            renderAvailableResults();
        });

    const token = localStorage.getItem("cognis_access_token");
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    fetch(buildSearchUrl(endpoint, query, typeFilter, searchOptions), {
        credentials: "same-origin",
        headers,
    })
        .then(async (response) => {
            if (!response.ok) return;
            const payload = await response.json();
            const responseData = payload?.data ?? [];
            const isGrouped =
                Array.isArray(responseData) &&
                responseData.length > 0 &&
                typeof responseData[0] === "object" &&
                "category" in responseData[0];
            const apiGroups = isGrouped
                ? responseData.map(normalizeSearchGroup).filter(Boolean)
                : [];
            const matchedApiGroups = filterVisibleSearchGroups(
                filterApiGroupMatches(apiGroups, query, searchOptions),
            );
            navigableApiGroups = isMultiSelect
                ? matchedApiGroups
                : filterNavigableGroups(matchedApiGroups);
            flatItems = isGrouped
                ? []
                : filterApiFlatMatches(responseData, query, searchOptions)
                      .filter(isSearchResultVisibleToUser)
                      .filter(
                          (item) => isMultiSelect || hasSelectableTarget(item),
                      );
        })
        .catch(() => {})
        .finally(() => {
            apiComplete = true;
            renderAvailableResults();
        });
}

export function registerSearchAvenue(componentId, avenue = {}) {
    const unregister = search.registerAvenue(componentId, avenue);
    const stageId = String(avenue.stageId ?? "component-indexes").trim();
    const hookKey = `search-capability:${stageId}`;
    if (
        uiCtx.flowExists("search") &&
        !REGISTERED_SEARCH_CATEGORY_HOOKS.has(hookKey)
    ) {
        REGISTERED_SEARCH_CATEGORY_HOOKS.add(hookKey);
        uiCtx.extendFlow("search", stageId, { id: hookKey }, (stageContext) =>
            search.runStage(stageContext),
        );
    }
    return unregister;
}

/**
 * Registers a dynamic grouped result provider for the global search popup.
 *
 * @param {string} categoryId
 * @param {() => object|object[]} provider
 * @param {{ stageId?: string, componentId?: string }} options
 * @returns {() => void}
 */
export function registerSearchCategory(categoryId, provider, options = {}) {
    const resolvedCategoryId = String(categoryId ?? "").trim();
    if (!resolvedCategoryId || typeof provider !== "function") {
        return () => {};
    }
    return registerSearchAvenue(options.componentId ?? resolvedCategoryId, {
        id: resolvedCategoryId,
        categoryId: resolvedCategoryId,
        provider,
        stageId: options.stageId ?? "component-indexes",
    });
}

/**
 * Registers a component-owned content index with the global search popup.
 *
 * @param {string} categoryId
 * @param {() => object|object[]} provider
 * @returns {() => void}
 */
export function registerSearchIndex(categoryId, provider, options = {}) {
    return registerSearchCategory(categoryId, provider, {
        stageId: "component-indexes",
        ...options,
    });
}

registerSearchCategory("visible-page", collectVisiblePageSearchGroups, {
    stageId: "visible-indexes",
});
registerSearchCategory("visible-posts", collectVisiblePostSearchGroups, {
    stageId: "visible-indexes",
});
registerSearchCategory(
    "visible-navigation",
    collectVisibleNavigationSearchGroups,
    {
        stageId: "visible-indexes",
    },
);
registerSearchIndex("global-docs", collectGlobalDocsSearchGroups, {
    stageId: "component-indexes",
});
registerSearchIndex("global-settings", collectGlobalSettingsSearchGroups, {
    stageId: "settings-index",
});
registerSearchIndex(
    "browser-preferences",
    collectBrowserPreferenceSearchGroups,
    {
        stageId: "settings-index",
    },
);

let searchPopupScrollLocked = false;
let previousSearchPopupBodyOverflow = "";

function lockSearchPopupScroll() {
    if (searchPopupScrollLocked) return;
    previousSearchPopupBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchPopupScrollLocked = true;
}

function unlockSearchPopupScroll() {
    if (!searchPopupScrollLocked) return;
    document.body.style.overflow = previousSearchPopupBodyOverflow;
    previousSearchPopupBodyOverflow = "";
    searchPopupScrollLocked = false;
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
    showOptions = true,
}) {
    const existingOverlay = document.querySelector(".search-popup-overlay");
    if (existingOverlay) {
        existingOverlay.__closeSearchPopup?.();
    }

    let debounceTimer = null;
    let currentQuery = "";
    const searchOptions = normalizeSearchOptions();
    const eventController = new AbortController();

    const overlay = document.createElement("div");
    overlay.className = "search-popup-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", ariaLabel);

    const popup = document.createElement("div");
    popup.className = "search-popup";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "search-popup-close btn-cancel";
    closeButton.setAttribute("aria-label", "Close search");
    closeButton.textContent = "×";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "search-popup-input";
    input.placeholder = resolvePopupPlaceholder(placeholder, category);
    input.setAttribute("aria-label", ariaLabel);
    input.setAttribute("autocomplete", "off");

    const categoriesContainer = document.createElement("div");
    categoriesContainer.className = "search-popup-result-categories";
    categoriesContainer.hidden = true;

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "search-popup-results";

    const inputWrap = document.createElement("div");
    inputWrap.className = "search-popup-input-wrap";
    inputWrap.appendChild(input);

    const pageFindControls = document.createElement("div");
    pageFindControls.className = "search-popup-page-find-controls";
    pageFindControls.hidden = true;
    const pageFindCounter = document.createElement("span");
    pageFindCounter.className = "search-popup-page-find-counter";
    pageFindCounter.textContent = "0/0";
    const previousFindButton = document.createElement("button");
    previousFindButton.type = "button";
    previousFindButton.className = "search-popup-page-find-nav";
    previousFindButton.setAttribute("aria-label", "Previous match");
    previousFindButton.textContent = "↑";
    const nextFindButton = document.createElement("button");
    nextFindButton.type = "button";
    nextFindButton.className = "search-popup-page-find-nav";
    nextFindButton.setAttribute("aria-label", "Next match");
    nextFindButton.textContent = "↓";
    pageFindControls.append(
        pageFindCounter,
        previousFindButton,
        nextFindButton,
    );
    inputWrap.appendChild(pageFindControls);
    inputWrap.appendChild(closeButton);
    popup.appendChild(inputWrap);

    if (showOptions) {
        const optionsBar = document.createElement("div");
        optionsBar.className = "search-popup-options";
        const optionConfigs = [
            ["wholeWord", "Whole word"],
            ["regex", "Regex"],
            ["caseSensitive", "Case-sensitive"],
            ["onThisPage", "On this page"],
        ];
        for (const [optionName, label] of optionConfigs) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "search-popup-option";
            button.textContent = label;
            button.setAttribute("aria-pressed", "false");
            button.addEventListener("click", () => {
                searchOptions[optionName] = !searchOptions[optionName];
                button.classList.toggle(
                    "search-popup-option--active",
                    searchOptions[optionName],
                );
                button.setAttribute(
                    "aria-pressed",
                    String(searchOptions[optionName]),
                );
                updateFinderMode();
                runCurrentSearch();
            });
            optionsBar.appendChild(button);
        }
        popup.appendChild(optionsBar);
    }

    popup.appendChild(categoriesContainer);
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
                const checkbox = item.querySelector(".choice-checkbox");
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

    const pageFindState = { highlights: [], currentIndex: -1 };

    const updateFinderMode = () => {
        const finderEnabled = Boolean(searchOptions.onThisPage);
        if (finderEnabled) {
            unlockSearchPopupScroll();
        } else {
            lockSearchPopupScroll();
        }
        overlay.classList.toggle("search-popup-overlay--finder", finderEnabled);
        popup.classList.toggle("search-popup--finder", finderEnabled);
        resultsContainer.hidden = finderEnabled;
        categoriesContainer.hidden = true;
        pageFindControls.hidden = !finderEnabled;
        if (!finderEnabled) {
            clearPageFindHighlights(pageFindState);
            pageFindCounter.textContent = "0/0";
        }
    };

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    lockSearchPopupScroll();
    renderSearchPendingMessage(resultsContainer, categoriesContainer);

    let closeStarted = false;
    const closeOverlay = () => {
        if (closeStarted) return;
        closeStarted = true;
        clearTimeout(debounceTimer);
        clearPageFindHighlights(pageFindState);
        eventController.abort();
        unlockSearchPopupScroll();
        overlay.classList.add("search-popup-overlay--closing");
        window.setTimeout(() => {
            overlay.remove();
            onClose?.();
        }, 140);
    };

    overlay.__closeSearchPopup = closeOverlay;

    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            closeOverlay();
            return;
        }
        if (searchOptions.onThisPage && event.key === "Enter") {
            event.preventDefault();
            movePageFindMatch(
                pageFindState,
                pageFindCounter,
                event.shiftKey ? -1 : 1,
            );
        }
    };

    const runCurrentSearch = () => {
        clearTimeout(debounceTimer);
        if (searchOptions.onThisPage) {
            renderPageFindHighlights(
                currentQuery,
                searchOptions,
                pageFindState,
            );
            setCurrentPageFindMatch(pageFindState, 0);
            updatePageFindCounter(pageFindCounter, pageFindState);
            return;
        }
        if (currentQuery.length < MIN_SEARCH_QUERY_LENGTH) {
            latestSearchRunId += 1;
            renderSearchPendingMessage(resultsContainer, categoriesContainer);
            return;
        }
        debounceTimer = setTimeout(
            () =>
                runSearch({
                    endpoint,
                    query: currentQuery,
                    resultsContainer,
                    categoriesContainer,
                    typeFilter,
                    localGroups,
                    noResultsText,
                    onSelect,
                    closeOverlay,
                    multiSelectState,
                    searchOptions,
                }),
            DEBOUNCE_MS,
        );
    };

    closeButton.addEventListener("click", () => {
        closeOverlay();
    });

    previousFindButton.addEventListener("click", () => {
        movePageFindMatch(pageFindState, pageFindCounter, -1);
        input.focus();
    });

    nextFindButton.addEventListener("click", () => {
        movePageFindMatch(pageFindState, pageFindCounter, 1);
        input.focus();
    });

    input.addEventListener("input", () => {
        const query = input.value.trim();
        if (query === currentQuery) return;
        currentQuery = query;
        runCurrentSearch();
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
    setActiveSearchToggleButton(toggleBtn);
    bindSearchShortcut();

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
