/**
 * Global search popup helpers.
 *
 * Public exports:
 *   openSearchPopup(options) — opens the shared centred search popup.
 *   createSearchBar(options) — returns a navbar search toggle button wrapper.
 *   search — ctx-backed search capability with component avenues.
 *   registerSearchAvenue(componentId, avenue) — registers one isolated component avenue.
 *   registerSearchCategory(categoryId, provider) — registers dynamic grouped results.
 *   registerSearchIndex(categoryId, provider) — registers component-owned content indexes.
 *
 * @module reuse/search-bar
 */

import { uiCtx } from "./ui-ctx.js";
import "./flow-registry.js";

const DEBOUNCE_MS = 280;
const REGISTERED_SEARCH_CATEGORY_HOOKS = new Set();
const MIN_SEARCH_QUERY_LENGTH = 2;
let activeSearchToggleButton = null;
let searchShortcutBound = false;

function createSearchCapability() {
    const avenuesByComponent = new Map();

    function normalizeComponentId(componentId) {
        return String(componentId ?? "").trim();
    }

    function normalizeAvenue(componentId, avenue = {}) {
        const normalizedComponentId = normalizeComponentId(componentId);
        const categoryId = String(
            avenue.categoryId ?? avenue.category ?? avenue.id ?? componentId,
        ).trim();
        const provider = avenue.provider ?? avenue.search ?? avenue.run;
        if (
            !normalizedComponentId ||
            !categoryId ||
            typeof provider !== "function"
        ) {
            return null;
        }
        return {
            ...avenue,
            id: String(avenue.id ?? categoryId).trim() || categoryId,
            componentId: normalizedComponentId,
            categoryId,
            stageId: String(avenue.stageId ?? "component-indexes").trim(),
            provider,
        };
    }

    function registerAvenue(componentId, avenue) {
        const normalizedAvenue = normalizeAvenue(componentId, avenue);
        if (!normalizedAvenue) return () => {};
        const componentAvenues =
            avenuesByComponent.get(normalizedAvenue.componentId) ?? [];
        const nextAvenues = componentAvenues.filter(
            (existingAvenue) => existingAvenue.id !== normalizedAvenue.id,
        );
        nextAvenues.push(normalizedAvenue);
        avenuesByComponent.set(normalizedAvenue.componentId, nextAvenues);
        return () => {
            const currentAvenues =
                avenuesByComponent.get(normalizedAvenue.componentId) ?? [];
            const remainingAvenues = currentAvenues.filter(
                (existingAvenue) => existingAvenue.id !== normalizedAvenue.id,
            );
            if (remainingAvenues.length) {
                avenuesByComponent.set(
                    normalizedAvenue.componentId,
                    remainingAvenues,
                );
            } else {
                avenuesByComponent.delete(normalizedAvenue.componentId);
            }
        };
    }

    function getAvenues(stageId = "") {
        return Array.from(avenuesByComponent.values())
            .flat()
            .filter((avenue) => !stageId || avenue.stageId === String(stageId));
    }

    async function runAvenue(avenue, providerContext) {
        return avenue.provider({
            ...providerContext,
            componentId: avenue.componentId,
            categoryId: avenue.categoryId,
            avenueId: avenue.id,
            stageId: avenue.stageId,
        });
    }

    async function runStage(stageContext) {
        const providerContext = {
            query: stageContext?.input?.query ?? "",
            searchOptions: normalizeSearchOptions(
                stageContext?.input?.searchOptions,
            ),
        };
        const results = await Promise.allSettled(
            getAvenues(stageContext?.stageId).map((avenue) =>
                runAvenue(avenue, providerContext).catch((error) => {
                    console.warn("[search-bar]:avenue-failed", {
                        componentId: avenue.componentId,
                        avenueId: avenue.id,
                        error,
                    });
                    return null;
                }),
            ),
        );
        return results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
            .filter(Boolean);
    }

    return {
        avenuesByComponent,
        registerAvenue,
        getAvenues,
        runAvenue,
        runStage,
    };
}

function ensureSearchCapability() {
    uiCtx.capabilities ??= {};
    uiCtx.capabilities.search ??= createSearchCapability();
    return uiCtx.capabilities.search;
}

export const search = ensureSearchCapability();

function focusOpenSearchInput() {
    const input = document.querySelector(".search-popup-input");
    if (!(input instanceof HTMLInputElement)) return false;
    input.focus();
    input.select();
    return true;
}

function bindSearchShortcut() {
    if (searchShortcutBound || typeof document === "undefined") return;
    searchShortcutBound = true;
    document.addEventListener("keydown", (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        if (String(event.key ?? "").toLowerCase() !== "f") return;
        event.preventDefault();
        if (focusOpenSearchInput()) return;
        activeSearchToggleButton?.click();
    });
}

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
        onThisPage: Boolean(options.onThisPage),
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

function normalizeResultClass(value) {
    const resultClass = String(value ?? "text")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return resultClass || "text";
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
        resultClass: normalizeResultClass(
            item.resultClass ?? item.searchResultClass ?? item.type ?? "text",
        ),
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

function collectBrowserPreferenceSearchGroups() {
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

async function collectGlobalSettingsSearchGroups() {
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

function collectGlobalDocsSearchGroups() {
    GLOBAL_DOCS_INDEX_PROMISE ??= loadGlobalDocsSearchGroups().finally(() => {
        GLOBAL_DOCS_INDEX_PROMISE = null;
    });
    return GLOBAL_DOCS_INDEX_PROMISE;
}

function collectVisibleNavigationSearchGroups() {
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

function collectVisiblePostSearchGroups() {
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

function collectVisibleContentSearchGroups() {
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

function collectVisiblePageSearchGroups() {
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
                item.showMatchSnippet !== false &&
                (fieldName === "searchText" || item.showMatchSnippet === true)
                    ? createHighlightedSnippet(value, match)
                    : "",
        };
    }
    return null;
}

function filterSearchGroupsForQuery(groups, query, options = {}) {
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

async function filterLocalGroupsIncrementally(
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

function mergeSearchGroups(groups) {
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

function isSearchResultVisibleToUser(item) {
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

function filterVisibleSearchGroups(groups) {
    return (groups ?? [])
        .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(isSearchResultVisibleToUser),
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

const FINDER_HIGHLIGHT_CLASS = "search-page-find-highlight";
const FINDER_CURRENT_CLASS = "search-page-find-highlight--current";

function clearPageFindHighlights(state) {
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

function renderPageFindHighlights(query, searchOptions, state) {
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

function setCurrentPageFindMatch(state, index) {
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

function updatePageFindCounter(counter, state) {
    const total = state.highlights.length;
    counter.textContent = total ? `${state.currentIndex + 1}/${total}` : "0/0";
}

function movePageFindMatch(state, counter, direction) {
    if (!state.highlights.length) return;
    setCurrentPageFindMatch(state, state.currentIndex + direction);
    updatePageFindCounter(counter, state);
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
            listItem.className = `search-popup-result search-popup-result--selectable search-popup-result--${item.resultClass}${isSelected ? " search-popup-result--checked" : ""}`;
            listItem.dataset.searchResultClass = item.resultClass;
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

/**
 * Registers one isolated component avenue with the ctx-backed search
 * capability, then ensures the relevant search-flow stage can execute it.
 *
 * @param {string} componentId
 * @param {{ id?: string, categoryId?: string, category?: string, stageId?: string, provider?: Function, search?: Function, run?: Function }} avenue
 * @returns {() => void}
 */
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
    activeSearchToggleButton = toggleBtn;
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
