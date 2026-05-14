import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

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

function resolveLanguageLabel(languageCode, fallbackName = "") {
    try {
        const displayName = new Intl.DisplayNames(["en"], {
            type: "language",
        }).of(languageCode);
        if (typeof displayName === "string" && displayName.trim()) {
            return displayName;
        }
    } catch {
        return fallbackName || languageCode;
    }
    return fallbackName || languageCode;
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
    const preferredLanguageCode = String(
        new URLSearchParams(window.location.search).get("language") ?? "",
    ).trim();

    const activeLanguageCodes =
        learningLanguages.length > 0
            ? learningLanguages
            : [fallbackLanguageCode].filter(Boolean);
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
        (preferredLanguageCode &&
            activeLanguageCodes.includes(preferredLanguageCode) &&
            preferredLanguageCode) ||
        (fallbackLanguageCode &&
            activeLanguageCodes.includes(fallbackLanguageCode) &&
            fallbackLanguageCode) ||
        activeLanguageCodes[0] ||
        fallbackLanguageCode;

    const modulesForSelectedLanguagePromise =
        SUB_NAV_CACHE.modulesByLanguage.get(selectedLanguageCode) ??
        loadLanguageModules(selectedLanguageCode);
    SUB_NAV_CACHE.modulesByLanguage.set(
        selectedLanguageCode,
        modulesForSelectedLanguagePromise,
    );
    const modules = await modulesForSelectedLanguagePromise;

    return {
        selectedLanguageCode,
        modules,
        learningLanguages: activeLanguageCodes,
        languageCatalogByCode,
    };
}

export function renderStudySubNavigation({ model, currentPath, i18n }) {
    const moduleLinks = (model.modules ?? [])
        .map((component) => {
            const pageUrl = String(component?.pageUrl ?? "").trim();
            if (!pageUrl) return "";
            const activeClass = pageUrl === currentPath ? " active" : "";
            return `
                <li>
                    <a class="study-subnav-link${activeClass}" href="${escapeHtml(pageUrl)}">
                        ${escapeHtml(String(component?.label ?? pageUrl))}
                    </a>
                </li>
            `;
        })
        .join("");

    const languageOptions = (model.learningLanguages ?? [])
        .map((languageCode) => {
            const language = model.languageCatalogByCode.get(languageCode) ?? {
                code: languageCode,
                flag: "",
                name: resolveLanguageLabel(languageCode),
            };
            const activeClass =
                languageCode === model.selectedLanguageCode ? " active" : "";
            const languageHubUrl = `/study?language=${encodeURIComponent(languageCode)}`;
            return `
                <li>
                    <a class="study-subnav-language-option${activeClass}" href="${escapeHtml(languageHubUrl)}">
                        ${escapeHtml(language.flag)}
                        <span>${escapeHtml(language.name)}</span>
                    </a>
                </li>
            `;
        })
        .join("");

    const settingsUrl = `/study/settings?language=${encodeURIComponent(model.selectedLanguageCode)}`;
    const settingsActiveClass =
        currentPath === "/study/settings" ? " active" : "";

    return `
        <div class="study-page-subnav">
            <ul class="page-subnav-list study-subnav-modules">
                ${moduleLinks}
            </ul>
            <ul class="page-subnav-list study-subnav-language-options">
                ${languageOptions}
            </ul>
            <a
                class="study-subnav-settings-link${settingsActiveClass}"
                href="${escapeHtml(settingsUrl)}"
                aria-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                title="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
            >
                ${SETTINGS_GEAR_SVG}
            </a>
        </div>
    `;
}
