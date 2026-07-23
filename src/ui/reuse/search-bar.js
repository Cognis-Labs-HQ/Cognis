/**
 * Global search popup helpers.
 *
 * Public exports:
 *   openSearchPopup(options) — opens the shared centred search popup.
 *   createSearchBar(options) — returns a navbar search toggle button wrapper.
 *   registerSearchCategory(categoryId, provider) — registers dynamic grouped results.
 *   registerSearchIndex(categoryId, provider) — registers component-owned content indexes.
 *
 * @module reuse/search-bar
 */

import { uiCtx } from "./ui-ctx.js";
import "./flow-registry.js";

const DEBOUNCE_MS = 280;
const REGISTERED_SEARCH_CATEGORIES = new Map();
const REGISTERED_SEARCH_CATEGORY_HOOKS = new Set();
const MIN_SEARCH_QUERY_LENGTH = 2;

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

function normalizeSearchOptions(options = {}) {
    return {
        wholeWord: Boolean(options.wholeWord),
        regex: Boolean(options.regex),
        caseSensitive: Boolean(options.caseSensitive),
    };
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createSearchMatchResolver(query, options = {}) {
    const normalizedOptions = normalizeSearchOptions(options);
    if (!query) return () => null;

    if (normalizedOptions.regex) {
        try {
            const flags = normalizedOptions.caseSensitive ? "" : "i";
            const expression = normalizedOptions.wholeWord
                ? `\\b(?:${query})\\b`
                : query;
            const regex = new RegExp(expression, flags);
            return (value) => {
                const match = regex.exec(String(value ?? ""));
                return match
                    ? {
                          index: match.index,
                          length: match[0].length,
                          text: match[0],
                      }
                    : null;
            };
        } catch {
            return () => null;
        }
    }

    const resolvedQuery = normalizedOptions.caseSensitive
        ? query
        : query.toLowerCase();
    const expression = normalizedOptions.wholeWord
        ? new RegExp(`\\b${escapeRegex(resolvedQuery)}\\b`)
        : null;

    return (value) => {
        const originalValue = String(value ?? "");
        const resolvedValue = normalizedOptions.caseSensitive
            ? originalValue
            : originalValue.toLowerCase();
        const match = expression
            ? expression.exec(resolvedValue)
            : { index: resolvedValue.indexOf(resolvedQuery) };
        if (!match || match.index < 0) return null;
        return {
            index: match.index,
            length: resolvedQuery.length,
            text: originalValue.slice(
                match.index,
                match.index + resolvedQuery.length,
            ),
        };
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createHighlightedSnippet(value, match) {
    const text = String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text || !match) return "";
    const contextSize = 44;
    const start = Math.max(0, match.index - contextSize);
    const end = Math.min(text.length, match.index + match.length + contextSize);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";
    const before = text.slice(start, match.index);
    const highlighted = text.slice(match.index, match.index + match.length);
    const after = text.slice(match.index + match.length, end);
    return `${prefix}${escapeHtml(before)}<mark>${escapeHtml(highlighted)}</mark>${escapeHtml(after)}${suffix}`;
}

function normalizeSearchItem(item, category) {
    if (!item || typeof item !== "object") return null;
    const url = String(item.url ?? "").trim();
    const id = String(
        item.id ?? item.handle ?? item.accountId ?? url ?? item.label ?? "",
    ).trim();
    const label = String(
        item.label ?? item.title ?? item.displayName ?? item.handle ?? id,
    ).trim();
    if (!id || !label) return null;
    return {
        ...item,
        id,
        label,
        url,
        description: item.description ?? item.meta ?? "",
        category: item.category ?? category,
    };
}

function normalizeSearchGroup(group) {
    if (!group || typeof group !== "object") return null;
    const category = String(group.category ?? "").trim();
    if (!category) return null;
    const items = (group.items ?? [])
        .map((item) => normalizeSearchItem(item, category))
        .filter(Boolean);
    return { category, items };
}

function isVisibleSearchElement(element) {
    const rect = element.getBoundingClientRect?.();
    return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function resolveVisibleContentCategory(element) {
    const registeredCategory = element.getAttribute("data-search-category");
    if (registeredCategory) return registeredCategory;
    if (element.matches("[data-message-id]")) return "Messages";
    if (element.matches("[data-chat-id]")) return "Chats";
    return "Visible Content";
}

function resolveVisibleContentLabel(element, text) {
    const explicitLabel = element.getAttribute("data-search-label");
    if (explicitLabel) return explicitLabel;
    const heading = element.querySelector("h1, h2, h3, h4, h5, h6");
    const headingText = String(heading?.innerText ?? "").trim();
    if (headingText) return headingText;
    return text.slice(0, 80);
}

function resolveSearchableElementText(element) {
    const explicitText = element.getAttribute("data-search-text");
    if (explicitText) return explicitText;
    const clone = element.cloneNode(true);
    clone
        .querySelectorAll("[data-search-exclude]")
        .forEach((excludedElement) => excludedElement.remove());
    return String(clone.innerText ?? clone.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

const BROWSER_PREFERENCE_LABELS = new Map([
    ["cognis_ui_preferences", "UI Preferences"],
    ["cognis_theme", "Theme"],
    ["cognis_language_priority", "Language Priority"],
    ["cognis_language_priority_mode", "Language Priority Mode"],
]);

function collectBrowserPreferenceSearchGroups() {
    const items = [];
    for (const [key, label] of BROWSER_PREFERENCE_LABELS) {
        const value = localStorage.getItem(key);
        if (!value) continue;
        items.push({
            id: `browser-preference:${key}`,
            label,
            url: "/settings",
            searchText: `${label} ${value}`,
        });
    }
    return items.length ? [{ category: "Settings", items }] : [];
}

function collectVisibleNavigationSearchGroups() {
    const items = [];
    const navigationLinks = document.querySelectorAll(
        ".topnav a[href], .page-subnav a[href]",
    );
    for (const link of navigationLinks) {
        if (!isVisibleSearchElement(link)) continue;
        const label = String(link.innerText ?? link.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim();
        const url = String(link.getAttribute("href") ?? "").trim();
        if (!label || !url || url === "#") continue;
        const parentLabel = String(
            link.closest(".page-subnav")
                ? (document.querySelector(".page-context")?.textContent ??
                      document.title)
                : "",
        )
            .replace(/\s+/g, " ")
            .trim();
        items.push({
            id: `navigation:${url}`,
            label,
            description: parentLabel,
            url,
            searchText: [parentLabel, label].filter(Boolean).join(" "),
        });
    }
    return items.length ? [{ category: "Navigation", items }] : [];
}

function collectVisibleContentSearchGroups() {
    const candidates = document.querySelectorAll(
        "[data-search-category], [data-message-id], [data-chat-id]",
    );
    const groups = new Map();
    for (const candidate of candidates) {
        if (!isVisibleSearchElement(candidate)) continue;
        const category = resolveVisibleContentCategory(candidate);
        const text = resolveSearchableElementText(candidate);
        if (!text) continue;
        const id =
            candidate.getAttribute("data-search-id") ||
            candidate.getAttribute("data-message-id") ||
            candidate.getAttribute("data-chat-id") ||
            candidate.id ||
            `${category}:${groups.size}`;
        const label = resolveVisibleContentLabel(candidate, text);
        const description =
            candidate.getAttribute("data-search-description") || "";
        const item = normalizeSearchItem(
            {
                id,
                label,
                description,
                url: candidate.id
                    ? `${window.location.pathname}${window.location.search}#${candidate.id}`
                    : `${window.location.pathname}${window.location.search}${window.location.hash}`,
                searchText: text,
            },
            category,
        );
        if (!item) continue;
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(item);
    }
    return Array.from(groups, ([category, items]) => ({ category, items }));
}

function collectVisiblePageSearchGroups() {
    const title = document.title?.trim() || window.location.pathname;
    const pageItem = normalizeSearchItem(
        {
            id: `page:${window.location.pathname}`,
            label: title,
            url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            searchText: title,
        },
        "Pages",
    );
    return pageItem ? [{ category: "Pages", items: [pageItem] }] : [];
}

function appendRegisteredSearchContribution(groups, categoryId, contribution) {
    const normalizedGroup = normalizeSearchGroup(contribution);
    if (normalizedGroup) {
        groups.push(normalizedGroup);
        return;
    }

    const normalizedItem = normalizeSearchItem(contribution, categoryId);
    if (normalizedItem) {
        groups.push({
            category: normalizedItem.category ?? categoryId,
            items: [normalizedItem],
        });
    }
}

async function resolveSearchProviderContribution(
    categoryId,
    provider,
    groups,
    providerContext = {},
) {
    try {
        const result = await provider(providerContext);
        const contributions = Array.isArray(result) ? result : [result];
        for (const contribution of contributions) {
            appendRegisteredSearchContribution(
                groups,
                categoryId,
                contribution,
            );
        }
    } catch (error) {
        console.warn("[search-bar]:category-provider-failed", {
            categoryId,
            error,
        });
    }
}

async function getRegisteredSearchGroups(query = "", searchOptions = {}) {
    if (uiCtx.flowExists("search")) {
        try {
            const flowResult = await uiCtx.runFlow("search", {
                query,
                searchOptions: normalizeSearchOptions(searchOptions),
            });
            const groups = [];
            for (const stageValues of Object.values(flowResult.stageResults)) {
                for (const result of stageValues) {
                    const contributions = Array.isArray(result)
                        ? result
                        : [result];
                    for (const contribution of contributions) {
                        appendRegisteredSearchContribution(
                            groups,
                            contribution?.category ?? "Search",
                            contribution,
                        );
                    }
                }
            }
            return groups;
        } catch (error) {
            console.warn("[search-bar]:search-flow-failed", { error });
        }
    }

    const groups = [];
    for (const [categoryId, registration] of REGISTERED_SEARCH_CATEGORIES) {
        const provider =
            typeof registration === "function"
                ? registration
                : registration?.provider;
        await resolveSearchProviderContribution(categoryId, provider, groups, {
            query,
            searchOptions: normalizeSearchOptions(searchOptions),
        });
    }
    return groups;
}

function attachSearchMatch(item, resolveMatch) {
    const fields = [
        ["label", item.label],
        ...(item.description && item.showDescription !== false
            ? [["description", item.description]]
            : []),
        ...(item.searchText ? [["searchText", item.searchText]] : []),
    ];
    for (const [fieldName, value] of fields) {
        const match = resolveMatch(value);
        if (!match) continue;
        return {
            ...item,
            matchField: fieldName,
            matchText: match.text,
            highlightedLabel:
                fieldName === "label"
                    ? createHighlightedSnippet(value, match)
                    : "",
            matchSnippet:
                fieldName === "searchText" || item.showMatchSnippet === true
                    ? createHighlightedSnippet(value, match)
                    : "",
        };
    }
    return null;
}

async function filterLocalGroups(localGroups, query, options = {}) {
    if (!query) return [];
    const resolveMatch = createSearchMatchResolver(query, options);
    const registeredGroups = await getRegisteredSearchGroups(query, options);
    return [...(localGroups ?? []), ...registeredGroups]
        .map(normalizeSearchGroup)
        .filter(Boolean)
        .map((group) => ({
            category: group.category,
            items: group.items
                .map((item) => attachSearchMatch(item, resolveMatch))
                .filter(Boolean),
        }))
        .filter((group) => group.items.length > 0);
}

function buildSearchUrl(endpoint, query, typeFilter, searchOptions = {}) {
    const resolvedTypeFilter =
        typeof typeFilter === "string" && typeFilter.trim()
            ? typeFilter.trim()
            : "";
    const connector = endpoint.includes("?") ? "&" : "?";
    const typeFilterParam = resolvedTypeFilter
        ? `&type=${encodeURIComponent(resolvedTypeFilter)}`
        : "";
    const options = normalizeSearchOptions(searchOptions);
    const optionParams = [
        options.wholeWord ? "wholeWord=1" : "",
        options.regex ? "regex=1" : "",
        options.caseSensitive ? "caseSensitive=1" : "",
    ]
        .filter(Boolean)
        .join("&");
    const optionSuffix = optionParams ? `&${optionParams}` : "";
    return `${endpoint}${connector}q=${encodeURIComponent(query)}${typeFilterParam}${optionSuffix}`;
}

function mergeSearchGroups(groups) {
    const groupedItems = new Map();
    const seenItems = new Set();
    for (const group of groups ?? []) {
        const category = String(group?.category ?? "").trim();
        if (!category || !Array.isArray(group.items)) continue;
        if (!groupedItems.has(category)) groupedItems.set(category, []);
        for (const item of group.items) {
            const itemKey = `${category}:${item.url ?? ""}:${item.id ?? ""}`;
            if (seenItems.has(itemKey)) continue;
            seenItems.add(itemKey);
            groupedItems.get(category).push(item);
        }
    }
    return Array.from(groupedItems, ([category, items]) => ({
        category,
        items,
    }));
}

function hasSelectableTarget(item) {
    return Boolean(
        String(item?.url ?? "").trim() ||
        String(item?.handle ?? "").trim() ||
        String(item?.id ?? "").trim() ||
        String(item?.accountId ?? "").trim(),
    );
}

function filterNavigableGroups(groups) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(hasSelectableTarget),
        }))
        .filter((group) => group.items.length > 0);
}

function shouldClientFilterApiResults(searchOptions = {}) {
    const options = normalizeSearchOptions(searchOptions);
    return options.wholeWord || options.regex || options.caseSensitive;
}

function filterApiGroupMatches(groups, query, searchOptions = {}) {
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

function filterApiFlatMatches(items, query, searchOptions = {}) {
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

function renderResultContent(listItem, item) {
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

function selectSearchResult(item, onSelect, closeOverlay) {
    Promise.resolve(onSelect(item))
        .catch((error) => {
            console.warn("[search-bar]:result-selection-failed", { error });
        })
        .finally(() => {
            requestAnimationFrame(() => closeOverlay());
        });
}

function resolveResultCategories(groups) {
    return Array.from(
        new Set(
            (groups ?? [])
                .filter((group) => group.items?.length > 0)
                .map((group) => String(group.category ?? "").trim())
                .filter(Boolean),
        ),
    );
}

function getCategoryFilterState(categoriesContainer) {
    if (!categoriesContainer) return null;
    if (!categoriesContainer.__selectedSearchCategories) {
        categoriesContainer.__selectedSearchCategories = new Set();
    }
    return categoriesContainer.__selectedSearchCategories;
}

function filterGroupsBySelectedCategories(groups, selectedCategories) {
    if (!selectedCategories || selectedCategories.size === 0) return groups;
    return (groups ?? []).filter((group) =>
        selectedCategories.has(String(group.category ?? "").trim()),
    );
}

function renderResultCategorySummary(
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

function renderGroupedResults(
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
            listItem.className = "search-popup-result";
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

function renderSearchPendingMessage(
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

function renderFlatResults(
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
            listItem.className = `search-popup-result search-popup-result--selectable${isSelected ? " search-popup-result--checked" : ""}`;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "search-popup-result-checkbox";
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
            listItem.className = "search-popup-result";
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

    const matchedLocalGroups = await filterLocalGroups(
        localGroups,
        query,
        searchOptions,
    );
    const isMultiSelect = Boolean(multiSelectState);
    const navigableLocalGroups = isMultiSelect
        ? matchedLocalGroups
        : filterNavigableGroups(matchedLocalGroups);

    try {
        const token = localStorage.getItem("cognis_access_token");
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const response = await fetch(
            buildSearchUrl(endpoint, query, typeFilter, searchOptions),
            {
                credentials: "same-origin",
                headers,
            },
        );

        if (!response.ok) {
            if (navigableLocalGroups.length > 0) {
                renderGroupedResults(
                    resultsContainer,
                    navigableLocalGroups,
                    onSelect,
                    closeOverlay,
                    categoriesContainer,
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
        const apiGroups = isGrouped
            ? responseData.map(normalizeSearchGroup).filter(Boolean)
            : [];
        const matchedApiGroups = filterApiGroupMatches(
            apiGroups,
            query,
            searchOptions,
        );
        const navigableApiGroups = isMultiSelect
            ? matchedApiGroups
            : filterNavigableGroups(matchedApiGroups);
        const flatItems = isGrouped
            ? []
            : filterApiFlatMatches(responseData, query, searchOptions).filter(
                  (item) => isMultiSelect || hasSelectableTarget(item),
              );
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
        } else if (flatItems.length > 0) {
            renderFlatResults(
                resultsContainer,
                flatItems,
                noResultsText,
                onSelect,
                closeOverlay,
                multiSelectState,
                categoriesContainer,
            );
        } else if (navigableLocalGroups.length === 0) {
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
    } catch {
        if (navigableLocalGroups.length > 0) {
            renderGroupedResults(
                resultsContainer,
                navigableLocalGroups,
                onSelect,
                closeOverlay,
                categoriesContainer,
            );
        }
    }
}

/**
 * Registers a dynamic grouped result provider for the global search popup.
 *
 * @param {string} categoryId
 * @param {() => object|object[]} provider
 * @returns {() => void}
 */
export function registerSearchCategory(categoryId, provider, options = {}) {
    const resolvedCategoryId = String(categoryId ?? "").trim();
    const stageId = String(options.stageId ?? "component-indexes").trim();
    if (!resolvedCategoryId || typeof provider !== "function") {
        return () => {};
    }
    const hookKey = `${stageId}:${resolvedCategoryId}`;
    REGISTERED_SEARCH_CATEGORIES.set(resolvedCategoryId, { provider, stageId });
    if (
        uiCtx.flowExists("search") &&
        !REGISTERED_SEARCH_CATEGORY_HOOKS.has(hookKey)
    ) {
        REGISTERED_SEARCH_CATEGORY_HOOKS.add(hookKey);
        uiCtx.extendFlow(
            "search",
            stageId,
            { id: `search:${resolvedCategoryId}` },
            (stageContext) =>
                REGISTERED_SEARCH_CATEGORIES.get(
                    resolvedCategoryId,
                )?.provider?.({
                    query: stageContext?.input?.query ?? "",
                    searchOptions: normalizeSearchOptions(
                        stageContext?.input?.searchOptions,
                    ),
                    stageId,
                }),
        );
    }
    return () => {
        REGISTERED_SEARCH_CATEGORIES.delete(resolvedCategoryId);
        // Flow hooks are append-only in uiCtx; removing the category disables
        // the fallback registry and makes the hook return no contribution.
    };
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
registerSearchCategory("visible-content", collectVisibleContentSearchGroups, {
    stageId: "visible-indexes",
});
registerSearchCategory(
    "visible-navigation",
    collectVisibleNavigationSearchGroups,
    {
        stageId: "visible-indexes",
    },
);
registerSearchIndex(
    "browser-preferences",
    collectBrowserPreferenceSearchGroups,
    {
        stageId: "settings-index",
    },
);

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

    popup.appendChild(input);

    if (showOptions) {
        const optionsBar = document.createElement("div");
        optionsBar.className = "search-popup-options";
        const optionConfigs = [
            ["wholeWord", "Whole word"],
            ["regex", "Regex"],
            ["caseSensitive", "Case-sensitive"],
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
    renderSearchPendingMessage(resultsContainer, categoriesContainer);

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

    const runCurrentSearch = () => {
        clearTimeout(debounceTimer);
        if (currentQuery.length < MIN_SEARCH_QUERY_LENGTH) {
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
