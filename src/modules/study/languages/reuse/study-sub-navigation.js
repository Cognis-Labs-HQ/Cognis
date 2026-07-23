import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    resolveLanguageLabel,
    isAdminScope,
    buildLibraryUrl,
} from "/static/modules/study/languages/reuse/language-utils.js";

const SETTINGS_GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;

async function loadLanguageModules(languageCode) {
    try {
        const response = await apiFetch(
            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
        );
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    } catch {
        return [];
    }
}

async function loadRegisteredLanguages() {
    try {
        const response = await apiFetch("/api/v1/study/registered-languages");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    } catch {
        return [];
    }
}

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
    registeredLanguages: null,
    learningLanguages: null,
    modulesByLanguage: new Map(),
};

/**
 * Clears the in-memory sub-navigation cache. Call this after any operation
 * that changes the user's learning language preferences so that the next
 * sub-navigation render fetches fresh data.
 *
 * @returns {void}
 */
export function clearStudySubNavCache() {
    SUB_NAV_CACHE.registeredLanguages = null;
    SUB_NAV_CACHE.learningLanguages = null;
    SUB_NAV_CACHE.modulesByLanguage = new Map();
}

function resolveDefaultChildPageUrl(modules) {
    const firstModulePageUrl = (modules ?? [])
        .map((component) => String(component?.pageUrl ?? "").trim())
        .find(Boolean);
    return firstModulePageUrl || "/study";
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
export async function loadStudySubNavigationModel({ fallbackLanguageCode }) {
    const [registeredLanguagesRaw, learningLanguagesRaw] = await Promise.all([
        SUB_NAV_CACHE.registeredLanguages ?? loadRegisteredLanguages(),
        SUB_NAV_CACHE.learningLanguages ?? loadLearningLanguages(),
    ]);
    SUB_NAV_CACHE.registeredLanguages = Promise.resolve(registeredLanguagesRaw);
    SUB_NAV_CACHE.learningLanguages = Promise.resolve(learningLanguagesRaw);

    const languageCatalogByCode = new Map();
    for (const registeredLanguage of registeredLanguagesRaw) {
        const languageCode = String(registeredLanguage?.code ?? "").trim();
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

    const learningLanguages = learningLanguagesRaw.filter((languageCode) =>
        Boolean(String(languageCode ?? "").trim()),
    );
    const activeLanguageCodes = Array.from(
        new Set([
            ...learningLanguages,
            ...[fallbackLanguageCode].filter(Boolean),
        ]),
    );
    for (const languageCode of activeLanguageCodes) {
        if (!languageCatalogByCode.has(languageCode)) {
            languageCatalogByCode.set(languageCode, {
                code: languageCode,
                flag: "",
                name: resolveLanguageLabel(languageCode),
            });
        }
    }

    const selectedLanguageCode =
        (fallbackLanguageCode && String(fallbackLanguageCode).trim()) ||
        activeLanguageCodes[0] ||
        fallbackLanguageCode;

    const modulesByLanguage = new Map();
    await Promise.all(
        activeLanguageCodes.map(async (languageCode) => {
            const modulesForLanguagePromise =
                SUB_NAV_CACHE.modulesByLanguage.get(languageCode) ??
                loadLanguageModules(languageCode);
            SUB_NAV_CACHE.modulesByLanguage.set(
                languageCode,
                modulesForLanguagePromise,
            );
            modulesByLanguage.set(
                languageCode,
                await modulesForLanguagePromise,
            );
        }),
    );

    const modules = modulesByLanguage.get(selectedLanguageCode) ?? [];
    const languagePageUrlsByCode = new Map(
        activeLanguageCodes.map((languageCode) => [
            languageCode,
            resolveDefaultChildPageUrl(modulesByLanguage.get(languageCode)),
        ]),
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
    const adminLibraryUrl = buildLibraryUrl();
    const hasLibraryModule = (model.modules ?? []).some(
        (component) => String(component?.id ?? "").trim() === "library",
    );
    const moduleLinks = (model.modules ?? [])
        .map((component) => {
            const pageUrl = String(component?.pageUrl ?? "").trim();
            if (!pageUrl) return "";
            const activeClass = pageUrl === currentPath ? " active" : "";
            return `
                <li>
                    <a class="study-subnav-link study-subnav-module-link${activeClass}" href="${escapeHtml(pageUrl)}" data-search-category="${escapeHtml(i18n.t("ui.reuse.navigation"))}" data-search-label="${escapeHtml(String(component?.label ?? pageUrl))}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
                        ${escapeHtml(String(component?.label ?? pageUrl))}
                    </a>
                </li>
            `;
        })
        .join("");
    const libraryLink =
        isAdminScope() && !hasLibraryModule
            ? `
            <li>
                <a class="study-subnav-link study-subnav-module-link${currentPath === "/study/library" ? " active" : ""}" href="${escapeHtml(adminLibraryUrl)}" data-search-category="${escapeHtml(i18n.t("ui.reuse.navigation"))}" data-search-label="${escapeHtml(i18n.t("gateway.study.library_label"))}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
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
                languageCode === model.selectedLanguageCode ? " active" : "";
            const languageHubUrl =
                model.languagePageUrlsByCode?.get(languageCode) || "/study";
            return `
                <li>
                    <a class="study-subnav-language-option${activeClass}" href="${escapeHtml(languageHubUrl)}" data-search-category="${escapeHtml(i18n.t("ui.reuse.navigation"))}" data-search-label="${escapeHtml(language.name)}" data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}">
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
            <a
                class="study-subnav-settings-link${settingsActiveClass}"
                href="${escapeHtml(settingsUrl)}"
                data-search-category="${escapeHtml(i18n.t("ui.reuse.navigation"))}"
                data-search-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                data-search-description="${escapeHtml(i18n.t("gateway.study.page_title"))}"
                aria-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                title="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
            >
                ${SETTINGS_GEAR_SVG}
            </a>
        </div>
    `;
}
