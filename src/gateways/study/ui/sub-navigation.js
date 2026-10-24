import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { languageExploreUrl, languageFlashcardsUrl } from "./reuse/explore.js";
import { replaceMountScope } from "/static/reuse/mount-scope.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { apiFetch } from "/static/reuse/api-client.js";
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
    dictionarySearchContext,
    fetchLibrarySchemas,
    fetchSearchableDictionaryProviders,
} from "/static/gateways/study/library-client.js";

const read = createOfflineReadCache();

const SETTINGS_GEAR_ICON = `<span class="study-settings-icon" aria-hidden="true"></span>`;

async function loadLearningLanguages() {
    return read("learningLanguages", async () => {
        const response = await apiFetch("/api/v1/study/preferences");
        if (!response.ok) throw new Error("study_preferences_unavailable");
        const payload = await response.json();
        return Array.isArray(payload?.data?.learningLanguages)
            ? [...new Set(payload.data.learningLanguages)]
            : [];
    });
}

const SUB_NAV_CACHE = {
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

const navigationScopes = new WeakMap();

export function bindStudySubNavigation(
    root,
    { signal: externalSignal, i18n } = {},
) {
    const controller = replaceMountScope(
        navigationScopes.get(root),
        externalSignal,
    );
    navigationScopes.set(root, controller);
    const signal = controller.signal;
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { signal, once: true },
    );
    root.addEventListener(
        "change",
        (event) => {
            const select = event.target.closest(
                "[data-study-dictionary-search] select[name=provider]",
            );
            if (!select) return;
            const button = select.form.querySelector("button[type=submit]");
            const label = select.selectedOptions[0].dataset.searchLabel;
            button.title = label;
            button.setAttribute("aria-label", label);
        },
        { signal },
    );
    root.addEventListener(
        "submit",
        async (event) => {
            const form = event.target.closest("[data-study-dictionary-search]");
            if (!form) return;
            event.preventDefault();
            const query = form.elements.query.value.trim();
            if (!query) return;
            const provider = JSON.parse(form.elements.provider.value);
            const button = form.querySelector("button[type=submit]");
            if (button.disabled) return;
            button.disabled = true;
            try {
                await dictionarySearchContext({
                    query,
                    providerId: provider.id,
                    schemaId: provider.schemaId,
                    language: form.dataset.language,
                });
                if (!signal?.aborted)
                    uiCtx.capabilities.get("ui:navigate")?.(
                        "/study/library/search",
                    );
            } catch {
                showToast(
                    i18n?.t("gateway.study.library_dictionary_error") ??
                        form.elements.query.getAttribute("aria-label"),
                    { variant: "error" },
                );
            } finally {
                button.disabled = false;
            }
        },
        { signal },
    );
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
        languageCatalogByCode,
        languagePageUrlsByCode,
    };
}

/** A composer slot shared by Study pages; route selection remains render-time state. */
export function createStudySubNavigationSlot(model, i18n) {
    return {
        id: "study-subnav",
        label: i18n.t("ui.reuse.study"),
        render: () =>
            renderStudySubNavigation({
                model,
                currentPath: window.location.pathname,
                i18n,
            }),
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
    const providerSearchLabel = (provider) =>
        i18n
            .t("gateway.study.dictionary_search_with")
            .replace(
                "{{ provider }}",
                provider.metadata.labels?.[document.documentElement.lang] ||
                    provider.metadata.labels?.en ||
                    provider.id,
            );
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
            const activeClass =
                rawPageUrl === currentPath ||
                currentPath.startsWith(`${rawPageUrl}/`)
                    ? " active"
                    : "";
            return `
                <li>
                    <a class="dropdown-item${activeClass}" href="${escapeHtml(pageUrl)}" data-search-category="Pages" data-search-label="${escapeHtml(label)}" data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
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
                <a class="dropdown-item${currentPath === "/study/library" ? " active" : ""}" href="${escapeHtml(libraryUrl)}" data-search-category="Pages" data-search-label="${escapeHtml(i18n.t("gateway.study.library_label"))}" data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
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
                    <a class="dropdown-item btn-no-animation${activeClass}" href="${escapeHtml(languageHubUrl)}" data-language-code="${escapeHtml(languageCode)}" data-search-category="Pages" data-search-label="${escapeHtml(language.name)}" data-search-description="${escapeHtml(i18n.t("ui.reuse.study"))}">
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
            ${
                model.dictionaryProviders?.length
                    ? createFormBuilder(
                          { i18n, escapeHtml },
                          {
                              formId: "study-dictionary-search",
                              formClassName: "study-dictionary-search",
                              formAttributes: {
                                  "data-study-dictionary-search": true,
                                  "data-language": model.selectedLanguageCode,
                              },
                              includeSubmitButton: false,
                              fields: [],
                              trustedContentHtml: `<select class="theme-select" name="provider" aria-label="${escapeHtml(i18n.t("gateway.study.dictionary_provider"))}"${model.dictionaryProviders.length === 1 ? " hidden" : ""}>${model.dictionaryProviders.map((provider) => `<option data-search-label="${escapeHtml(providerSearchLabel(provider))}" value="${escapeHtml(JSON.stringify({ id: provider.id, schemaId: provider.schemaId }))}">${escapeHtml(provider.metadata.labels?.[document.documentElement.lang] || provider.metadata.labels?.en || provider.id)}</option>`).join("")}</select>
                <input name="query" maxlength="100" required autocomplete="off" aria-label="${escapeHtml(i18n.t("gateway.study.dictionary_search"))}" placeholder="${escapeHtml(i18n.t("gateway.study.dictionary_search"))}">
                <button type="submit" class="btn-neutral" aria-label="${escapeHtml(providerSearchLabel(model.dictionaryProviders[0]))}" title="${escapeHtml(providerSearchLabel(model.dictionaryProviders[0]))}"><span class="study-dictionary-search-icon" aria-hidden="true"></span></button>`,
                          },
                      ).render()
                    : ""
            }
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
