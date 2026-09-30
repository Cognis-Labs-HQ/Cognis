import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadSpaRoutes } from "/static/reuse/spa-route-registry.js";
import {
    resolveLanguageLabel,
    buildLibraryUrl,
    isAdminScope,
    parseLanguageCode,
} from "/static/gateways/study/ui/language.js";
import {
    fetchLibraryPushRequests,
    fetchLibrarySchemas,
} from "/static/gateways/study/ui/library-client.js";

const SETTINGS_GEAR_ICON = `<picture><source media="(prefers-color-scheme: dark)" srcset="/static/assets/reuse/settings-cog-dark.svg"><img src="/static/assets/reuse/settings-cog-light.svg" alt=""></picture>`;

async function loadLearningLanguages() {
    try {
        const response = await apiFetch("/api/v1/study/preferences");
        if (!response.ok) return [];
        const payload = await response.json();
        if (!Array.isArray(payload?.data?.learningLanguages)) {
            return [];
        }
        return [...new Set(payload.data.learningLanguages)];
    } catch {
        return [];
    }
}

const SUB_NAV_CACHE = {
    learningLanguages: null,
};

export function readSelectedStudyLanguageCode() {
    const selectedButton = document.querySelector(
        ".study-subnav-language-options .dropdown-item.active[data-language-code]",
    );
    return parseLanguageCode(
        history.state?.studyLanguageCode ??
            selectedButton?.dataset.languageCode,
    );
}

export function bindStudySubNavigation(root, { signal } = {}) {
    root.addEventListener(
        "click",
        (event) => {
            const settingsLink = event.target.closest("a[data-study-settings]");
            const link = event.target.closest("a[data-language-code]");
            if (!link && !settingsLink) return;
            const navigate = uiCtx.capabilities.get("ui:navigate");
            if (typeof navigate !== "function") return;
            event.preventDefault();
            event.stopPropagation();
            const destination = link ?? settingsLink;
            const currentPageUrl = resolveRememberedStudyPageUrl(
                window.location.pathname,
            );
            navigate(destination.getAttribute("href"), {
                state: {
                    studyLanguageCode:
                        link?.dataset.languageCode ??
                        readSelectedStudyLanguageCode(),
                    studyLastPageUrl: currentPageUrl,
                },
            });
        },
        { signal },
    );
}

/**
 * Clears the in-memory sub-navigation cache. Call this after any operation
 * that changes the user's learning language preferences so that the next
 * sub-navigation render fetches fresh data.
 *
 * @returns {void}
 */
export function clearStudySubNavCache() {
    SUB_NAV_CACHE.learningLanguages = null;
    uiCtx.capabilities.get("ui:subPages")?.invalidate("study");
}

function resolveDefaultChildPageUrl(modules) {
    const firstModulePageUrl = (modules ?? [])
        .map((component) => String(component?.pageUrl ?? "").trim())
        .find(Boolean);
    return firstModulePageUrl || "/study";
}

function resolveRememberedStudyPageUrl(currentPath) {
    return [
        currentPath,
        history.state?.studyLastPageUrl,
        history.state?.previousRouterPage,
    ].find(
        (path) =>
            typeof path === "string" &&
            path.startsWith("/study/") &&
            !["/study/settings", "/study/welcome"].includes(path),
    );
}

/**
 * Loads the shared Study child-page sub-navigation model for a language module
 * page.
 *
 * Public exports:
 *   loadStudySubNavigationModel — loads the active learning languages,
 *   resolves display labels, selects the active language, and fetches child
 *   component links for the active and switchable Study languages.
 *   renderStudySubNavigation — renders the shared Study child-page
 *   sub-navigation HTML string from the loaded model.
 *   clearStudySubNavCache — clears the in-memory cache; call after the user
 *   changes their learning-language preferences so the next render is fresh.
 *
 * Usage:
 *   const model = await loadStudySubNavigationModel({
 *     fallbackLanguageCode: 'ja',
 *   });
 *
 * @param {{ fallbackLanguageCode?: string }} options - Fallback language code
 * used when the current user has no saved Study language preferences and to
 * mark the current child page's language as active.
 * @returns {Promise<{
 *   selectedLanguageCode: string | undefined,
 *   modules: Array<object>,
 *   learningLanguages: string[],
 *   languageCatalogByCode: Map<string, { code: string, flag: string, name: string }>,
 *   languagePageUrlsByCode: Map<string, string>
 * }>} Model data for shared Study child-page sub-navigation rendering.
 */
export async function loadStudySubNavigationModel({
    fallbackLanguageCode,
} = {}) {
    const requestedLanguageCode = parseLanguageCode(fallbackLanguageCode);
    const subPages = uiCtx.capabilities.get("study:subPages");
    if (!subPages) throw new Error("Study sub-page provider unavailable.");
    const learningLanguagesRaw = await loadLearningLanguages();
    SUB_NAV_CACHE.learningLanguages = Promise.resolve(learningLanguagesRaw);

    const requestedModel = await subPages.load("study", {
        selectedGroupId: requestedLanguageCode,
        groupIds: learningLanguagesRaw,
    });
    const registeredLanguagesRaw = requestedModel.groups;

    const languageCatalogByCode = new Map();
    for (const registeredLanguage of registeredLanguagesRaw) {
        const languageCode = parseLanguageCode(registeredLanguage?.code);
        if (!languageCode) continue;
        languageCatalogByCode.set(languageCode, {
            code: languageCode,
            flag: String(registeredLanguage?.flag ?? "").trim(),
            name: resolveLanguageLabel(
                languageCode,
                String(registeredLanguage?.name ?? "").trim(),
            ),
        });
    }

    const learningLanguages = learningLanguagesRaw
        .map((languageCode) => parseLanguageCode(languageCode))
        .filter((languageCode) => languageCatalogByCode.has(languageCode));
    const activeLanguageCodes = Array.from(
        new Set([
            ...learningLanguages,
            ...[requestedLanguageCode].filter((languageCode) =>
                languageCatalogByCode.has(languageCode),
            ),
        ]),
    );

    const selectedLanguageCode = activeLanguageCodes.includes(
        requestedLanguageCode,
    )
        ? requestedLanguageCode
        : activeLanguageCodes[0];

    const modulesByLanguage = requestedModel.pagesByGroup;

    const modules = [...(modulesByLanguage.get(selectedLanguageCode) ?? [])];
    const schemas = selectedLanguageCode
        ? await fetchLibrarySchemas(selectedLanguageCode).catch(() => [])
        : [];
    const pendingLibraryRequests = await fetchLibraryPushRequests().catch(
        () => [],
    );
    const activeLocale = document.documentElement.lang;
    for (const schema of schemas) {
        for (const layer of schema.layers ?? []) {
            if (
                ["definition", "meaning", "particle"].includes(
                    layer.semanticRole,
                )
            ) {
                continue;
            }
            const labels = layer.metadata?.labels ?? {};
            const label = labels[activeLocale] ?? layer.id;
            modules.push({
                id: `library-${schema.id}-${layer.id}`,
                label,
                pageUrl: `/study/layers/${encodeURIComponent(schema.id)}/${encodeURIComponent(layer.id)}`,
                order: 200,
            });
        }
    }
    const spaRoutes = await loadSpaRoutes();
    if (spaRoutes.some((route) => route.base === "/study/leaderboard")) {
        modules.push({
            id: "leaderboard",
            label: "Leaderboard",
            labelKey: "gateway.study.leaderboard_label",
            pageUrl: "/study/leaderboard",
            order: 300,
        });
    }
    const requestsRoute = spaRoutes.find(
        (route) => route.base === "/study/library/requests",
    );
    if (requestsRoute) {
        const navigationLabels = requestsRoute.navigationLabels ?? {};
        modules.push({
            id: "library-requests",
            label:
                navigationLabels[activeLocale] ??
                navigationLabels[activeLocale.split("-")[0]] ??
                navigationLabels.en,
            labelKey: "gateway.study.library_requests",
            pageUrl: "/study/library/requests",
            order: 290,
            attention: pendingLibraryRequests.some(
                (request) => request.canReview === true,
            ),
        });
    }
    modules.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    const rememberedPageUrl = resolveRememberedStudyPageUrl(
        window.location.pathname,
    );
    const languagePageUrlsByCode = new Map(
        activeLanguageCodes.map((languageCode) => {
            const languageModules = modulesByLanguage.get(languageCode) ?? [];
            const registeredPageUrls = new Set(
                languageModules.map((component) =>
                    String(component?.pageUrl ?? "").trim(),
                ),
            );
            return [
                languageCode,
                rememberedPageUrl && registeredPageUrls.has(rememberedPageUrl)
                    ? rememberedPageUrl
                    : resolveDefaultChildPageUrl(languageModules),
            ];
        }),
    );

    return {
        selectedLanguageCode,
        modules,
        learningLanguages: activeLanguageCodes,
        languageCatalogByCode,
        languagePageUrlsByCode,
    };
}

/**
 * Renders the shared Study child-page sub-navigation HTML.
 *
 * Usage:
 *   const subNavigationHtml = renderStudySubNavigation({
 *     model,
 *     currentPath: window.location.pathname,
 *     i18n,
 *   });
 *
 * @param {{
 *   model: {
 *     selectedLanguageCode: string | undefined,
 *     modules: Array<object>,
 *     learningLanguages: string[],
 *     languageCatalogByCode: Map<string, { code: string, flag: string, name: string }>,
 *     languagePageUrlsByCode: Map<string, string>
 *   },
 *   currentPath: string,
 *   i18n: { t: (key: string) => string }
 * }} options - Render context for the shared Study child-page sub-navigation.
 * @returns {string} HTML string for the Study child-page sub-navigation.
 */
export function renderStudySubNavigation({ model, currentPath, i18n }) {
    const selectedLanguageCode = model.selectedLanguageCode ?? "";
    const libraryUrl = buildLibraryUrl();
    const hasLibraryModule = (model.modules ?? []).some(
        (component) => String(component?.id ?? "").trim() === "library",
    );
    const moduleLinks = (model.modules ?? [])
        .map((component) => {
            const rawPageUrl = String(component?.pageUrl ?? "").trim();
            if (!rawPageUrl) return "";
            const pageUrl = rawPageUrl;
            const translatedLabel = component?.labelKey
                ? i18n.t(component.labelKey)
                : "";
            const label =
                translatedLabel && translatedLabel !== component?.labelKey
                    ? translatedLabel
                    : String(component?.label ?? pageUrl);
            const activeClass = rawPageUrl === currentPath ? " active" : "";
            const attentionClass = component.attention
                ? " study-subnav-attention"
                : "";
            return `
                <li>
                    <a class="dropdown-item${activeClass}${attentionClass}" href="${escapeHtml(pageUrl)}" data-search-category="Pages" data-search-label="${escapeHtml(label)}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
                        ${escapeHtml(label)}
                    </a>
                </li>
            `;
        })
        .join("");
    const libraryLink =
        isAdminScope() && !hasLibraryModule
            ? `
            <li>
                <a class="dropdown-item${currentPath === "/study/library" ? " active" : ""}" href="${escapeHtml(libraryUrl)}" data-search-category="Pages" data-search-label="${escapeHtml(i18n.t("gateway.study.library_label"))}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
                    ${escapeHtml(i18n.t("gateway.study.library_label"))}
                </a>
            </li>
        `
            : "";

    const languageOptions = (model.learningLanguages ?? [])
        .map((languageCode) => {
            const language = model.languageCatalogByCode.get(languageCode) ?? {
                code: languageCode,
                flag: "",
                name: resolveLanguageLabel(languageCode),
            };
            const activeClass =
                currentPath !== "/study/settings" &&
                languageCode === model.selectedLanguageCode
                    ? " active"
                    : "";
            const languageHubUrl =
                model.languagePageUrlsByCode?.get(languageCode) || "/study";
            return `
                <li>
                    <a class="dropdown-item btn-no-animation${activeClass}" href="${escapeHtml(languageHubUrl)}" data-language-code="${escapeHtml(languageCode)}" data-search-category="Pages" data-search-label="${escapeHtml(language.name)}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
                        ${escapeHtml(language.flag)}
                        <span>${escapeHtml(language.name)}</span>
                    </a>
                </li>
            `;
        })
        .join("");

    const settingsUrl = "/study/settings";
    const settingsActiveClass =
        currentPath === "/study/settings" ? " active" : "";

    return `
        <div class="study-page-subnav">
            <ul class="page-subnav-list study-subnav-modules">
                ${moduleLinks}${libraryLink}
            </ul>
            <ul class="page-subnav-list study-subnav-language-options">
                ${languageOptions}
            </ul>
            <ul class="page-subnav-list study-subnav-settings">
                <li>
                    <a
                        class="dropdown-item${settingsActiveClass}"
                        href="${escapeHtml(settingsUrl)}"
                        data-study-settings
                        data-search-category="Pages"
                        data-search-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                        data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}"
                        aria-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                        title="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                    >
                        ${SETTINGS_GEAR_ICON}
                    </a>
                </li>
            </ul>
        </div>
    `;
}
