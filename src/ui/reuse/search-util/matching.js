/** Search data collection, normalization, filtering, and ranking helpers.
 * @module reuse/search-util/matching
 */
import { uiCtx } from "../ui-ctx.js";
import { search } from "./capability.js";
import { REGISTERED_SEARCH_CATEGORY_HOOKS } from "./state.js";
export { search } from "./capability.js";
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
export function resolvePopupPlaceholder(rawPlaceholder, category) {
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
export function normalizeSearchOptions(options = {}) {
    return {
        wholeWord: Boolean(options.wholeWord),
        regex: Boolean(options.regex),
        caseSensitive: Boolean(options.caseSensitive),
        onThisPage: Boolean(options.onThisPage),
    };
}
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function createSearchMatchResolver(query, options = {}) {
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

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function createHighlightedSnippet(value, match) {
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

function normalizeResultClass(value) {
    const resultClass = String(value ?? "text")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return resultClass || "text";
}

export function normalizeSearchItem(item, category) {
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
        resultClass: normalizeResultClass(
            item.resultClass ?? item.searchResultClass ?? item.type ?? "text",
        ),
        category: item.category ?? category,
    };
}

export function normalizeSearchGroup(group) {
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

function formatSearchPreferenceLabel(key) {
    return String(key ?? "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tryParsePreferenceValue(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function shouldIndexBrowserPreferenceKey(key) {
    const normalizedKey = String(key ?? "").toLowerCase();
    return !(
        normalizedKey.includes("changelogseenslug") ||
        normalizedKey.includes("changelog_seen_slug") ||
        normalizedKey.includes("seen-slug") ||
        normalizedKey.includes("messagestyle") ||
        normalizedKey.includes("message_style")
    );
}

function collectStructuredPreferenceItems(
    key,
    label,
    value,
    labelPrefix = label,
) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value)
            .filter(([entryKey]) => shouldIndexBrowserPreferenceKey(entryKey))
            .flatMap(([entryKey, entryValue]) =>
                collectStructuredPreferenceItems(
                    `${key}:${entryKey}`,
                    label,
                    entryValue,
                    [labelPrefix, formatSearchPreferenceLabel(entryKey)]
                        .filter(Boolean)
                        .join(" — "),
                ),
            );
    }
    if (Array.isArray(value)) {
        return value.flatMap((entryValue, index) =>
            collectStructuredPreferenceItems(
                `${key}:${index}`,
                label,
                entryValue,
                `${labelPrefix} — ${index + 1}`,
            ),
        );
    }
    return [
        {
            id: `browser-preference:${key}`,
            label: labelPrefix,
            description: label,
            resultClass: "preference",
            url: "/settings",
            searchText: [labelPrefix, value].filter(Boolean).join(" "),
        },
    ];
}

const BROWSER_PREFERENCE_LABELS = new Map([
    ["cognis_ui_preferences", "UI Preferences"],
    ["cognis_theme", "Theme"],
    ["cognis_language_priority", "Language Priority"],
    ["cognis_language_priority_mode", "Language Priority Mode"],
]);

export function collectBrowserPreferenceSearchGroups() {
    const items = [];
    for (const [key, label] of BROWSER_PREFERENCE_LABELS) {
        const value = localStorage.getItem(key);
        if (!value) continue;
        items.push(
            ...collectStructuredPreferenceItems(
                key,
                label,
                tryParsePreferenceValue(value),
            ),
        );
    }
    return items.length ? [{ category: "Settings", items }] : [];
}

export async function collectGlobalSettingsSearchGroups() {
    const payload = await searchFetchJson("/api/v1/ui/settings-sections");
    const sections = Array.isArray(payload?.data) ? payload.data : [];
    const items = [
        {
            id: "settings-page",
            label: "Settings",
            description: "Settings",
            url: "/settings",
            resultClass: "page",
            searchText: "Settings User Settings Preferences",
            visible: true,
        },
    ];
    for (const section of sections) {
        const label = String(
            section?.label ?? section?.heading ?? section?.id ?? "",
        ).trim();
        if (!label) continue;
        const heading = String(section?.heading ?? label).trim();
        const sectionId = String(section?.id ?? label).trim();
        items.push({
            id: `settings-section:${sectionId}`,
            label,
            description: heading === label ? "Settings" : heading,
            url: `/settings#${encodeURIComponent(sectionId)}`,
            resultClass: "heading",
            searchText: ["Settings", label, heading, sectionId]
                .filter(Boolean)
                .join(" "),
            visible: true,
        });
    }
    return [{ category: "Settings", items }];
}

const GLOBAL_DOCS_SEARCH_CONTENT = new Map();
let GLOBAL_DOCS_INDEX_PROMISE = null;

function searchFetchJson(path) {
    const token = localStorage.getItem("cognis_access_token");
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    return fetch(path, { credentials: "same-origin", headers }).then(
        (response) => (response.ok ? response.json() : null),
    );
}

function markdownHtmlToSearchText(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html ?? "");
    template.content
        .querySelectorAll("script, style")
        .forEach((node) => node.remove());
    return String(template.content.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function docSearchTitle(item) {
    return String(item?.title ?? item?.slug ?? "")
        .split("/")
        .pop()
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function isSearchChangelogDoc(item) {
    return String(item?.slug ?? "").startsWith("changelog/");
}

function changelogSearchRoute(slug) {
    return `/changelogs/${String(slug).replace(/^changelog\//, "")}`;
}

async function loadGlobalDocsSearchGroups() {
    const payload = await searchFetchJson("/api/v1/docs");
    const docs = Array.isArray(payload?.data) ? payload.data : [];
    const langs = String(
        localStorage.getItem("cognis_language_priority") ?? "",
    );
    const docsItems = [];
    const changelogItems = [];
    const indexedDocs = await Promise.all(
        docs.map(async (item) => {
            const slug = String(item?.slug ?? "").trim();
            if (!slug) return null;
            const title = docSearchTitle(item);
            let bodyText = GLOBAL_DOCS_SEARCH_CONTENT.get(slug) ?? "";
            if (!bodyText) {
                const htmlResponse = await fetch(
                    `/api/v1/docs/${slug}?langs=${encodeURIComponent(langs)}`,
                    { credentials: "same-origin" },
                ).catch(() => null);
                bodyText = htmlResponse?.ok
                    ? markdownHtmlToSearchText(await htmlResponse.text())
                    : "";
                GLOBAL_DOCS_SEARCH_CONTENT.set(slug, bodyText);
            }
            const changelog = isSearchChangelogDoc(item);
            return {
                changelog,
                item: {
                    id: `global-docs:${slug}`,
                    label: title,
                    description: `${changelog ? "Changelogs" : "Docs"} / ${item.group || "platform"}`,
                    url: changelog
                        ? changelogSearchRoute(slug)
                        : `/docs/${slug}`,
                    resultClass: "page",
                    searchText: [
                        title,
                        slug,
                        item.group,
                        item.description,
                        bodyText,
                    ]
                        .filter(Boolean)
                        .join(" "),
                    visible: true,
                },
            };
        }),
    );
    for (const indexedDoc of indexedDocs.filter(Boolean)) {
        if (indexedDoc.changelog) changelogItems.push(indexedDoc.item);
        else docsItems.push(indexedDoc.item);
    }
    return [
        docsItems.length ? { category: "Docs", items: docsItems } : null,
        changelogItems.length
            ? { category: "Changelogs", items: changelogItems }
            : null,
    ].filter(Boolean);
}

export function collectGlobalDocsSearchGroups() {
    GLOBAL_DOCS_INDEX_PROMISE ??= loadGlobalDocsSearchGroups().finally(() => {
        GLOBAL_DOCS_INDEX_PROMISE = null;
    });
    return GLOBAL_DOCS_INDEX_PROMISE;
}

export function collectVisibleNavigationSearchGroups() {
    const items = [];
    const navigationLinks = document.querySelectorAll(
        [
            ".topnav a[href]",
            ".page-subnav a[href]",
            ".study-subnav a[href]",
            '[data-search-category="Pages"][href]',
        ].join(", "),
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
            resultClass: "page",
            searchText: [parentLabel, label].filter(Boolean).join(" "),
        });
    }
    return items.length ? [{ category: "Pages", items }] : [];
}

export function collectVisiblePostSearchGroups() {
    const items = [];
    const postCards = document.querySelectorAll("[data-post-id]");
    for (const postCard of postCards) {
        if (!isVisibleSearchElement(postCard)) continue;
        const postId = String(
            postCard.getAttribute("data-post-id") ?? "",
        ).trim();
        const label =
            postCard.getAttribute("data-search-label") ||
            String(
                postCard.querySelector(".profile-post-title")?.textContent ??
                    "Post",
            ).trim();
        const description =
            postCard.getAttribute("data-search-description") ||
            String(postCard.querySelector("time")?.textContent ?? "").trim();
        const searchText =
            postCard.getAttribute("data-search-text") ||
            resolveSearchableElementText(postCard);
        const targetId = postCard.id || `post-${encodeURIComponent(postId)}`;
        if (!postId || !label || !searchText) continue;
        items.push({
            id: `post:${postId}`,
            label,
            description,
            url: `${window.location.pathname}${window.location.search}#${targetId}`,
            resultClass: "text",
            searchText,
            visible: true,
        });
    }
    return items.length ? [{ category: "Posts", items }] : [];
}

export function collectVisibleContentSearchGroups() {
    const candidates = document.querySelectorAll(
        [
            "[data-search-category]",
            "[data-search-label]",
            "[data-search-text]",
            "[data-message-id]",
            "[data-chat-id]",
            "main h1",
            "main h2",
            "main h3",
            "main h4",
            "main h5",
            "main h6",
        ].join(", "),
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
                url:
                    candidate.id || candidate.getAttribute("data-search-id")
                        ? `${window.location.pathname}${window.location.search}#${candidate.id || candidate.getAttribute("data-search-id")}`
                        : `${window.location.pathname}${window.location.search}${window.location.hash}`,
                resultClass:
                    candidate.getAttribute("data-search-result-class") ||
                    (candidate.matches("h1, h2, h3, h4, h5, h6")
                        ? "heading"
                        : "text"),
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

function currentSearchPageUrl() {
    if (window.location.pathname === "/whiteboard") return "/whiteboards";
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function currentSearchPageLabel() {
    if (window.location.pathname === "/whiteboard") return "Whiteboards";
    return document.title?.trim() || window.location.pathname;
}

export function collectVisiblePageSearchGroups() {
    const title = currentSearchPageLabel();
    const pageItem = normalizeSearchItem(
        {
            id: `page:${window.location.pathname}`,
            label: title,
            url: currentSearchPageUrl(),
            resultClass: "page",
            searchText: title,
        },
        "Pages",
    );
    return pageItem ? [{ category: "Pages", items: [pageItem] }] : [];
}

export function appendRegisteredSearchContribution(
    groups,
    categoryId,
    contribution,
) {
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
    for (const avenue of search.getAvenues()) {
        await resolveSearchProviderContribution(
            avenue.categoryId,
            (providerContext) => search.runAvenue(avenue, providerContext),
            groups,
            {
                query,
                searchOptions: normalizeSearchOptions(searchOptions),
            },
        );
    }
    return groups;
}

export function attachSearchMatch(item, resolveMatch) {
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
                item.showMatchSnippet !== false &&
                (fieldName === "searchText" || item.showMatchSnippet === true)
                    ? createHighlightedSnippet(value, match)
                    : "",
        };
    }
    return null;
}

export function filterSearchGroupsForQuery(groups, query, options = {}) {
    if (!query) return [];
    const resolveMatch = createSearchMatchResolver(query, options);
    return filterVisibleSearchGroups(
        (groups ?? [])
            .map(normalizeSearchGroup)
            .filter(Boolean)
            .map((group) => ({
                category: group.category,
                items: group.items
                    .map((item) => attachSearchMatch(item, resolveMatch))
                    .filter(Boolean),
            }))
            .filter((group) => group.items.length > 0),
    );
}

async function filterLocalGroups(localGroups, query, options = {}) {
    const registeredGroups = await getRegisteredSearchGroups(query, options);
    return filterSearchGroupsForQuery(
        [...(localGroups ?? []), ...registeredGroups],
        query,
        options,
    );
}

function stageRank(stageId) {
    const stageOrder = [
        "visible-indexes",
        "component-indexes",
        "settings-index",
    ];
    const index = stageOrder.indexOf(String(stageId ?? ""));
    return index < 0 ? stageOrder.length : index;
}

export async function filterLocalGroupsIncrementally(
    localGroups,
    query,
    options = {},
    onGroups = () => {},
) {
    const baseGroups = filterSearchGroupsForQuery(localGroups, query, options);
    if (baseGroups.length) onGroups(baseGroups);
    const providerContext = {
        query,
        searchOptions: normalizeSearchOptions(options),
    };
    const sortedAvenues = [...search.getAvenues()].sort(
        (left, right) =>
            stageRank(left.stageId) - stageRank(right.stageId) ||
            left.categoryId.localeCompare(right.categoryId),
    );
    const avenueTasks = sortedAvenues.map(async (avenue) => {
        try {
            const result = await search.runAvenue(avenue, providerContext);
            const groups = [];
            const contributions = Array.isArray(result) ? result : [result];
            for (const contribution of contributions) {
                appendRegisteredSearchContribution(
                    groups,
                    avenue.categoryId,
                    contribution,
                );
            }
            const filteredGroups = filterSearchGroupsForQuery(
                groups,
                query,
                options,
            );
            if (filteredGroups.length) onGroups(filteredGroups);
        } catch (error) {
            console.warn("[search-bar]:category-provider-failed", {
                categoryId: avenue.categoryId,
                error,
            });
        }
    });
    await Promise.allSettled(avenueTasks);
}

export function buildSearchUrl(
    endpoint,
    query,
    typeFilter,
    searchOptions = {},
) {
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

function normalizeSearchUrlKey(url) {
    const rawUrl = String(url ?? "").trim();
    if (!rawUrl) return "";
    try {
        const resolvedUrl = new URL(rawUrl, window.location.origin);
        return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
    } catch {
        return rawUrl;
    }
}

const SEARCH_CATEGORY_RANKS = new Map([
    ["Pages", 0],
    ["Docs", 90],
    ["Changelogs", 100],
]);

function getSearchCategoryRank(category) {
    return SEARCH_CATEGORY_RANKS.get(category) ?? 50;
}

export function mergeSearchGroups(groups) {
    const groupedItems = new Map();
    const categoryOrder = new Map();
    const seenItems = new Set();
    for (const group of groups ?? []) {
        const category = String(group?.category ?? "").trim();
        if (!category || !Array.isArray(group.items)) continue;
        if (!groupedItems.has(category)) {
            groupedItems.set(category, []);
            categoryOrder.set(category, categoryOrder.size);
        }
        for (const item of group.items) {
            const urlKey = normalizeSearchUrlKey(item.url);
            const labelKey = String(item.label ?? "")
                .trim()
                .toLowerCase();
            const itemKey = [
                category,
                urlKey,
                category === "Pages" ? "" : (item.id ?? labelKey),
            ].join(":");
            if (seenItems.has(itemKey)) continue;
            seenItems.add(itemKey);
            groupedItems.get(category).push(item);
        }
    }
    return Array.from(groupedItems, ([category, items]) => ({
        category,
        items,
    })).sort((left, right) => {
        const rankDifference =
            getSearchCategoryRank(left.category) -
            getSearchCategoryRank(right.category);
        if (rankDifference !== 0) return rankDifference;
        return (
            categoryOrder.get(left.category) - categoryOrder.get(right.category)
        );
    });
}

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

function escapeSearchSelectorToken(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
    }
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isInternalSearchUrlAccessible(url) {
    const rawUrl = String(url ?? "").trim();
    if (!rawUrl) return true;
    try {
        const resolvedUrl = new URL(rawUrl, window.location.origin);
        if (resolvedUrl.origin !== window.location.origin) return false;
        if (
            resolvedUrl.protocol !== "http:" &&
            resolvedUrl.protocol !== "https:"
        ) {
            return false;
        }
        if (
            resolvedUrl.pathname === window.location.pathname &&
            resolvedUrl.hash
        ) {
            const targetId = decodeURIComponent(resolvedUrl.hash.slice(1));
            const target =
                document.getElementById(targetId) ||
                document.querySelector(
                    `[data-search-id="${escapeSearchSelectorToken(targetId)}"], [data-search-anchor="${escapeSearchSelectorToken(targetId)}"]`,
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

export function isSearchResultVisibleToUser(item) {
    if (
        item?.visible === false ||
        item?.isVisible === false ||
        item?.hidden === true ||
        item?.private === true
    ) {
        return false;
    }
    const itemId = String(item?.id ?? "").trim();
    const target = itemId
        ? document.querySelector(
              `[data-search-id="${escapeSearchSelectorToken(itemId)}"], [data-search-anchor="${escapeSearchSelectorToken(itemId)}"], [data-message-id="${escapeSearchSelectorToken(itemId)}"], [data-post-id="${escapeSearchSelectorToken(itemId)}"]`,
          )
        : null;
    if (target && !isVisibleSearchElement(target)) return false;
    return isInternalSearchUrlAccessible(item?.url);
}

export function filterVisibleSearchGroups(groups) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(isSearchResultVisibleToUser),
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
