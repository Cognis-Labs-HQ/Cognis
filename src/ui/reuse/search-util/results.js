/**
 * Search result rendering and on-page find helpers.
 *
 * @module reuse/search-util/results
 */

import { createSearchMatchResolver, escapeHtml } from "./matching.js";
import { MIN_SEARCH_QUERY_LENGTH } from "./state.js";

export function renderResultContent(listItem, item) {
    const label = document.createElement("span");
    label.className = "search-popup-result-label";
    if (item.highlightedLabel) {
        label.innerHTML = item.highlightedLabel;
    } else {
        label.textContent =
            item.label || item.displayName || item.accountId || item.id || "";
    }
    listItem.appendChild(label);

    const description =
        item.showDescription === false
            ? ""
            : item.description || item.meta || "";
    if (description) {
        const descriptionElement = document.createElement("span");
        descriptionElement.className = "search-popup-result-description";
        descriptionElement.textContent = description;
        listItem.appendChild(descriptionElement);
    }

    if (item.matchSnippet) {
        const snippet = document.createElement("span");
        snippet.className = "search-popup-result-snippet";
        snippet.innerHTML = item.matchSnippet;
        listItem.appendChild(snippet);
    }
}

export function selectSearchResult(item, onSelect, closeOverlay) {
    Promise.resolve(onSelect(item))
        .catch((error) => {
            console.warn("[search-bar]:result-selection-failed", { error });
        })
        .finally(() => {
            requestAnimationFrame(() => closeOverlay());
        });
}

export function resolveResultCategories(groups) {
    return Array.from(
        new Set(
            (groups ?? [])
                .filter((group) => group.items?.length > 0)
                .map((group) => String(group.category ?? "").trim())
                .filter(Boolean),
        ),
    );
}

export function getCategoryFilterState(categoriesContainer) {
    if (!categoriesContainer) return null;
    if (!categoriesContainer.__selectedSearchCategories) {
        categoriesContainer.__selectedSearchCategories = new Set();
    }
    return categoriesContainer.__selectedSearchCategories;
}

export function filterGroupsBySelectedCategories(groups, selectedCategories) {
    if (!selectedCategories || selectedCategories.size === 0) return groups;
    return (groups ?? []).filter((group) =>
        selectedCategories.has(String(group.category ?? "").trim()),
    );
}

export function renderResultCategorySummary(
    categoriesContainer,
    groups,
    onCategoryFilterChange,
) {
    if (!categoriesContainer) return;
    categoriesContainer.innerHTML = "";
    const categories = resolveResultCategories(groups);
    const selectedCategories = getCategoryFilterState(categoriesContainer);
    for (const selectedCategory of Array.from(selectedCategories)) {
        if (!categories.includes(selectedCategory)) {
            selectedCategories.delete(selectedCategory);
        }
    }
    if (categories.length < 2) {
        categoriesContainer.hidden = true;
        return;
    }
    categoriesContainer.hidden = false;
    for (const category of categories) {
        const categoryPill = document.createElement("button");
        const isSelected = selectedCategories.has(category);
        categoryPill.type = "button";
        categoryPill.className = `search-popup-result-category-pill${
            isSelected ? " search-popup-result-category-pill--active" : ""
        }`;
        categoryPill.textContent = category;
        categoryPill.setAttribute("aria-pressed", String(isSelected));
        categoryPill.addEventListener("click", () => {
            if (selectedCategories.has(category)) {
                selectedCategories.delete(category);
            } else {
                selectedCategories.add(category);
            }
            onCategoryFilterChange?.();
        });
        categoriesContainer.appendChild(categoryPill);
    }
}

export function renderGroupedResults(
    resultsContainer,
    groups,
    onSelect,
    closeOverlay,
    categoriesContainer = null,
) {
    const renderFilteredGroups = () =>
        renderGroupedResults(
            resultsContainer,
            groups,
            onSelect,
            closeOverlay,
            categoriesContainer,
        );
    renderResultCategorySummary(
        categoriesContainer,
        groups,
        renderFilteredGroups,
    );
    const visibleGroups = filterGroupsBySelectedCategories(
        groups,
        getCategoryFilterState(categoriesContainer),
    );
    resultsContainer.innerHTML = "";
    for (const group of visibleGroups) {
        if (!group.items?.length) continue;
        const heading = document.createElement("h3");
        heading.className = "search-popup-category";
        heading.textContent = group.category;
        resultsContainer.appendChild(heading);

        const list = document.createElement("ul");
        list.className = "search-popup-result-list";

        for (const item of group.items) {
            const listItem = document.createElement("li");
            listItem.className = `search-popup-result search-popup-result--${item.resultClass}`;
            listItem.dataset.searchResultClass = item.resultClass;
            listItem.setAttribute("role", "button");
            listItem.tabIndex = 0;
            renderResultContent(listItem, item);
            listItem.addEventListener("click", (event) => {
                event.preventDefault();
                selectSearchResult(item, onSelect, closeOverlay);
            });
            listItem.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    selectSearchResult(item, onSelect, closeOverlay);
                }
            });
            list.appendChild(listItem);
        }

        resultsContainer.appendChild(list);
    }
}

export const FINDER_HIGHLIGHT_CLASS = "search-page-find-highlight";
export const FINDER_CURRENT_CLASS = "search-page-find-highlight--current";

export function clearPageFindHighlights(state) {
    for (const highlight of state.highlights ?? []) {
        const parent = highlight.parentNode;
        if (!parent) continue;
        parent.replaceChild(
            document.createTextNode(highlight.textContent ?? ""),
            highlight,
        );
        parent.normalize();
    }
    state.highlights = [];
    state.currentIndex = -1;
}

function collectTextMatches(text, query, searchOptions) {
    const resolver = createSearchMatchResolver(query, searchOptions);
    const matches = [];
    let offset = 0;
    while (offset < text.length) {
        const match = resolver(text.slice(offset));
        if (!match || match.index < 0 || match.length <= 0) break;
        const index = offset + match.index;
        matches.push({ index, length: match.length });
        offset = index + match.length;
    }
    return matches;
}

function isFindableTextNode(node) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue?.trim()) return false;
    return !parent.closest(
        ".search-popup-overlay, script, style, textarea, input, select, option",
    );
}

export function renderPageFindHighlights(query, searchOptions, state) {
    clearPageFindHighlights(state);
    if (query.length < MIN_SEARCH_QUERY_LENGTH) return;
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) =>
                isFindableTextNode(node)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT,
        },
    );
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
        const text = node.nodeValue ?? "";
        const matches = collectTextMatches(text, query, searchOptions);
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        for (const match of matches) {
            if (match.index > cursor) {
                fragment.appendChild(
                    document.createTextNode(text.slice(cursor, match.index)),
                );
            }
            const highlight = document.createElement("mark");
            highlight.className = FINDER_HIGHLIGHT_CLASS;
            highlight.textContent = text.slice(
                match.index,
                match.index + match.length,
            );
            fragment.appendChild(highlight);
            state.highlights.push(highlight);
            cursor = match.index + match.length;
        }
        if (cursor < text.length)
            fragment.appendChild(document.createTextNode(text.slice(cursor)));
        node.parentNode?.replaceChild(fragment, node);
    }
}

export function setCurrentPageFindMatch(state, index) {
    for (const highlight of state.highlights) {
        highlight.classList.remove(FINDER_CURRENT_CLASS);
    }
    if (!state.highlights.length) {
        state.currentIndex = -1;
        return;
    }
    state.currentIndex =
        (index + state.highlights.length) % state.highlights.length;
    const current = state.highlights[state.currentIndex];
    current.classList.add(FINDER_CURRENT_CLASS);
    current.scrollIntoView({ block: "center", behavior: "smooth" });
}

export function updatePageFindCounter(counter, state) {
    const total = state.highlights.length;
    counter.textContent = total ? `${state.currentIndex + 1}/${total}` : "0/0";
}

export function movePageFindMatch(state, counter, direction) {
    if (!state.highlights.length) return;
    setCurrentPageFindMatch(state, state.currentIndex + direction);
    updatePageFindCounter(counter, state);
}

export function renderSearchPendingMessage(
    resultsContainer,
    categoriesContainer = null,
) {
    if (categoriesContainer) {
        categoriesContainer.innerHTML = "";
        categoriesContainer.hidden = true;
        getCategoryFilterState(categoriesContainer)?.clear();
    }
    resultsContainer.innerHTML = "";
    const message = document.createElement("p");
    message.className = "search-popup-no-results";
    message.textContent = `Type at least ${MIN_SEARCH_QUERY_LENGTH} characters to search.`;
    resultsContainer.appendChild(message);
}

export function renderFlatResults(
    resultsContainer,
    items,
    noResultsText,
    onSelect,
    closeOverlay,
    multiSelectState,
    categoriesContainer = null,
) {
    if (categoriesContainer) {
        categoriesContainer.innerHTML = "";
        categoriesContainer.hidden = true;
        getCategoryFilterState(categoriesContainer)?.clear();
    }
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

    function toggleMultiSelectItem(uniqueItemKey, item) {
        if (!multiSelectState) {
            return;
        }
        if (multiSelectState.selected.has(uniqueItemKey)) {
            multiSelectState.selected.delete(uniqueItemKey);
            multiSelectState.itemMap.delete(uniqueItemKey);
        } else {
            multiSelectState.selected.add(uniqueItemKey);
            multiSelectState.itemMap.set(uniqueItemKey, item);
        }
        multiSelectState.onSelectionChange();
    }

    for (const item of items) {
        const listItem = document.createElement("li");
        const uniqueItemKey = item.handle ?? item.id ?? item.accountId ?? "";
        const isSelected = multiSelectState?.selected.has(uniqueItemKey);

        if (multiSelectState) {
            listItem.className = `search-popup-result search-popup-result--selectable search-popup-result--${item.resultClass}${isSelected ? " search-popup-result--checked" : ""}`;
            listItem.dataset.searchResultClass = item.resultClass;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "choice-checkbox";
            checkbox.checked = Boolean(isSelected);
            checkbox.dataset.key = uniqueItemKey;
            checkbox.setAttribute("aria-hidden", "true");
            checkbox.tabIndex = -1;
            listItem.setAttribute("role", "checkbox");
            listItem.setAttribute("aria-checked", String(Boolean(isSelected)));
            listItem.tabIndex = 0;
            listItem.appendChild(checkbox);
            const content = document.createElement("span");
            content.className = "search-popup-result-content";
            renderResultContent(content, item);
            listItem.appendChild(content);
            listItem.addEventListener("click", (event) => {
                event.preventDefault();
                toggleMultiSelectItem(uniqueItemKey, item);
            });
            listItem.addEventListener("keydown", (event) => {
                if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    toggleMultiSelectItem(uniqueItemKey, item);
                }
            });
        } else {
            listItem.className = `search-popup-result search-popup-result--${item.resultClass}`;
            listItem.dataset.searchResultClass = item.resultClass;
            listItem.setAttribute("role", "button");
            listItem.tabIndex = 0;
            renderResultContent(listItem, item);
            listItem.addEventListener("click", (event) => {
                event.preventDefault();
                selectSearchResult(item, onSelect, closeOverlay);
            });
            listItem.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    selectSearchResult(item, onSelect, closeOverlay);
                }
            });
        }

        list.appendChild(listItem);
    }

    resultsContainer.appendChild(list);
}
