import { mountLanguageLabels } from "./language-labels.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { fetchStudyPreferences } from "./navigation-client.js";
import { languageExploreUrl, languageFlashcardsUrl } from "./reuse/explore.js";
import { replaceMountScope } from "/static/reuse/mount-scope.js";
import {
    mountDictionarySearch,
    renderDictionarySearch,
} from "./sub-navigation-search.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadSpaRoutes } from "/static/reuse/spa-route-registry.js";
import {
    resolveLanguageLabel,
    buildLibraryUrl,
    isAdminScope,
    parseLanguageCode,
} from "/static/gateways/study/language.js";
import {
    fetchLibrarySchemas,
    fetchSearchableDictionaryProviders,
} from "/static/gateways/study/library-client.js";

const SETTINGS_GEAR_ICON = `<span class="study-settings-icon" aria-hidden="true"></span>`;

async function loadLearningLanguages() {
    const preferences = await fetchStudyPreferences();
    return Array.isArray(preferences?.learningLanguages)
        ? [...new Set(preferences.learningLanguages)]
        : [];
}

const SUBJECT_NAVIGATION_CACHE = {
    learningLanguages: null,
};

export function readSelectedStudyLanguageCode() {
    const selectedButton = document.querySelector(
        ".study-subnav-language-options [data-language-code].active",
    );
    return parseLanguageCode(
        history.state?.studyLanguageCode ??
            selectedButton?.dataset.languageCode,
    );
}

const isManagementPage = (path) => /^\/study\/library(?:\/|$)/.test(path ?? "");
const managementDisabledAttributes = () =>
    isOffline() ? ' aria-disabled="true" data-offline-disabled="true"' : "";

const navigationScopes = new WeakMap();

function bindStudyNestedNavigation(
    root,
    { signal: externalSignal, i18n } = {},
) {
    const controller = replaceMountScope(
        navigationScopes.get(root),
        externalSignal,
    );
    navigationScopes.set(root, controller);
    const signal = controller.signal;
    if (signal.aborted) return;
    const updateManagementLinks = () => {
        for (const link of root.querySelectorAll('a[href^="/study/library"]')) {
            if (!isManagementPage(link.getAttribute("href"))) continue;
            if (isOffline()) {
                link.setAttribute("aria-disabled", "true");
                link.dataset.offlineDisabled = "true";
            } else if (link.dataset.offlineDisabled) {
                link.removeAttribute("aria-disabled");
                delete link.dataset.offlineDisabled;
            }
        }
    };
    updateManagementLinks();
    window.addEventListener(
        "cognis:connectivity-changed",
        updateManagementLinks,
        { signal },
    );
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { signal, once: true },
    );
    mountDictionarySearch(root, { signal, i18n });
    mountLanguageLabels(root, signal);
    const lists = [
        ...root.querySelectorAll(
            ".study-subnav-modules, .study-subnav-language-options",
        ),
    ];
    const revealActive = () => {
        if (signal.aborted) return;
        for (const list of lists) {
            const active = list.querySelector(".active");
            if (!active) continue;
            const bounds = list.getBoundingClientRect();
            const selected = active.getBoundingClientRect();
            if (selected.right > bounds.right)
                list.scrollLeft += selected.right - bounds.right;
            else if (selected.left < bounds.left)
                list.scrollLeft += selected.left - bounds.left;
        }
    };
    if (lists.length) {
        const observer = new ResizeObserver(revealActive);
        for (const list of lists) {
            observer.observe(list);
            for (const link of list.querySelectorAll("a"))
                observer.observe(link);
        }
        signal.addEventListener("abort", () => observer.disconnect(), {
            once: true,
        });
        document.fonts.ready.then(revealActive);
        revealActive();
    }

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
            if (destination.getAttribute("aria-disabled") === "true") return;
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
export { bindStudyNestedNavigation as bindStudySubNavigation };

/**
 * Clears the in-memory sub-navigation cache. Call this after any operation
 * that changes the user's learning language preferences so that the next
 * sub-navigation render fetches fresh data.
 *
 * @returns {void}
 */
function clearStudyNestedNavigationCache() {
    SUBJECT_NAVIGATION_CACHE.learningLanguages = null;
    uiCtx.capabilities.get("ui:subPages")?.invalidate("study");
    globalThis.window?.dispatchEvent?.(
        new CustomEvent("cognis:study-enrollment-changed"),
    );
}
export { clearStudyNestedNavigationCache as clearStudySubNavCache };

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
async function loadStudyNestedNavigationModel({ fallbackLanguageCode } = {}) {
    const requestedLanguageCode = parseLanguageCode(fallbackLanguageCode);
    const nestedPages = uiCtx.capabilities.get("study:subPages");
    if (!nestedPages) throw new Error("Study sub-page provider unavailable.");
    const learningLanguagesRaw = await loadLearningLanguages();
    SUBJECT_NAVIGATION_CACHE.learningLanguages =
        Promise.resolve(learningLanguagesRaw);

    const requestedModel = await nestedPages.load("study", {
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
    const schemas = await fetchLibrarySchemas().catch(() => []);
    const activeLocale = document.documentElement.lang;
    const spaRoutes = await loadSpaRoutes();
    if (spaRoutes.some((route) => route.base === "/study/explore"))
        modules.push({
            id: "explore",
            labelKey: "gateway.study.explore",
            pageUrl: "/study/explore",
            order: 200,
        });
    for (const route of spaRoutes.filter(
        (route) =>
            Object.values(route.navigationLabels ?? {}).some(
                (label) => typeof label === "string" && label.trim(),
            ) &&
            route.base.startsWith("/study/") &&
            route.base !== "/study/library/requests" &&
            !modules.some((page) => page.pageUrl === route.base),
    )) {
        const labels = route.navigationLabels;
        modules.push({
            id: route.id,
            label:
                labels[activeLocale] ??
                labels[activeLocale.split("-")[0]] ??
                labels.en,
            pageUrl:
                route.base === "/study/flashcards"
                    ? languageFlashcardsUrl(selectedLanguageCode)
                    : route.base,
            order: 210,
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
            pageUrl: "/study/library/requests",
            order: 290,
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
                /^\/study(?:\/[^/]+)?\/flashcards(?:\/|$)/.test(
                    rememberedPageUrl ?? "",
                )
                    ? languageFlashcardsUrl(languageCode)
                    : rememberedPageUrl &&
                        registeredPageUrls.has(rememberedPageUrl)
                      ? rememberedPageUrl
                      : rememberedPageUrl &&
                          spaRoutes.some(
                              (route) =>
                                  route.base !== "/study/explore" &&
                                  route.base.startsWith("/study/") &&
                                  (route.base === rememberedPageUrl ||
                                      rememberedPageUrl.startsWith(
                                          `${route.base}/`,
                                      )),
                          )
                        ? rememberedPageUrl
                        : languageModules.length
                          ? resolveDefaultChildPageUrl(languageModules)
                          : spaRoutes.some(
                                  (route) => route.base === "/study/explore",
                              )
                            ? (languageExploreUrl(
                                  schemas,
                                  languageCode,
                                  rememberedPageUrl,
                              ) ?? "/study")
                            : "/study",
            ];
        }),
    );

    return {
        selectedLanguageCode,
        dictionaryProviders:
            selectedLanguageCode &&
            schemas.some((schema) => schema.language === selectedLanguageCode)
                ? await fetchSearchableDictionaryProviders(selectedLanguageCode)
                : [],
        modules,
        learningLanguages: activeLanguageCodes,
        enrolledLanguages: learningLanguages,
        languageCatalogByCode,
        languagePageUrlsByCode,
    };
}
export { loadStudyNestedNavigationModel as loadStudySubNavigationModel };

/** A composer slot shared by Study pages; route selection remains render-time state. */
function createStudyNestedNavigationSlot(model, i18n) {
    return {
        id: "study-subnav",
        label: i18n.t("ui.reuse.study"),
        render: () =>
            renderStudyNestedNavigation({
                model,
                currentPath: window.location.pathname,
                i18n,
            }),
    };
}
export { createStudyNestedNavigationSlot as createStudySubNavigationSlot };

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
function renderStudyNestedNavigation({ model, currentPath, i18n }) {
    const libraryUrl = buildLibraryUrl();
    const hasLibraryModule = (model.modules ?? []).some(
        (component) => String(component?.id ?? "").trim() === "library",
    );
    const activePageUrl = [
        ...(model.modules ?? []).map((component) => component.pageUrl),
        ...(isAdminScope() && !hasLibraryModule ? [libraryUrl] : []),
    ]
        .filter(
            (url) =>
                typeof url === "string" &&
                (currentPath === url || currentPath.startsWith(`${url}/`)),
        )
        .sort((left, right) => right.length - left.length)[0];
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
            const activeClass = rawPageUrl === activePageUrl ? " active" : "";
            return `
                <li>
                    <a class="dropdown-item${activeClass}" href="${escapeHtml(pageUrl)}"${isManagementPage(pageUrl) ? managementDisabledAttributes() : ""} data-search-category="Pages" data-search-label="${escapeHtml(label)}" data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
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
                <a class="dropdown-item${activePageUrl === libraryUrl ? " active" : ""}" href="${escapeHtml(libraryUrl)}"${managementDisabledAttributes()} data-search-category="Pages" data-search-label="${escapeHtml(i18n.t("gateway.study.library_label"))}" data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
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
                    <a class="dropdown-item btn-no-animation${activeClass}"
                        href="${escapeHtml(languageHubUrl)}"
                        data-language-code="${escapeHtml(languageCode)}"
                        aria-label="${escapeHtml(language.name)}"
                        title="${escapeHtml(language.name)}"
                        data-language-has-flag="${Boolean(language.flag?.trim())}"
                        ${model.enrolledLanguages?.includes(languageCode) ? "data-study-enrolled" : ""}
                        data-search-category="Pages"
                        data-search-label="${escapeHtml(language.name)}"
                        data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
                        <span class="study-language-flag" aria-hidden="true">${escapeHtml(language.flag)}</span>
                        <span class="study-language-name" aria-hidden="true">${escapeHtml(language.name)}</span>
                        <span class="study-language-code" aria-hidden="true">${escapeHtml(languageCode.toUpperCase())}</span>
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
            ${renderDictionarySearch(model, i18n)}
            <ul class="page-subnav-list study-subnav-settings">
                <li>
                    <a
                        class="dropdown-item${settingsActiveClass}"
                        href="${escapeHtml(settingsUrl)}"
                        data-study-settings
                        data-search-category="Pages"
                        data-search-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                        data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}"
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
export { renderStudyNestedNavigation as renderStudySubNavigation };
