/**
 * Lightweight i18n layer backed by per-locale strings.xml files.
 *
 * - createI18n(options)              — loads locale strings for the user's preferred language(s)
 *                                      and returns a `{ t(key) }` resolver.
 *                                      Pass `componentStringBaseUrls` to merge additional per-component
 *                                      strings alongside the core locale file.
 * - extendI18n(baseI18n, stringsBaseUrl) — returns a new resolver with core strings from
 *                                          `baseI18n` merged with component strings from `stringsBaseUrl`.
 * - applyStaticTranslations(i18n)    — resolves data-i18n / data-i18n-placeholder /
 *                                      data-i18n-aria-label / data-i18n-alt attributes in the DOM.
 * - applyDocumentTitle(i18n, key)    — sets document.title from a locale key.
 * - readPreferredLanguages()         — returns the stored language-priority array.
 * - setPreferredLanguages(languages) — persists a language-priority array to localStorage + cookie.
 *
 * Usage:
 *   const i18n = await createI18n({ preferredLanguages: ['es', 'en'], componentStringBaseUrls: ['/static/my-component/languages'] });
 *   i18n.t('ui.reuse.save');   // → 'Guardar'
 *   applyStaticTranslations(i18n);
 */
export const DEFAULT_LOCALE = "en";
const STRINGS_BASE_PATH = "/static/languages";

const cache = new Map();

const LANGUAGE_COOKIE = "cognis_lang_priority";

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeLanguageCookie(locale) {
    document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function setPreferredLanguages(languages) {
    const normalized = [
        ...new Set(
            (languages || [DEFAULT_LOCALE])
                .map((item) => normalizeLocale(item))
                .filter(Boolean),
        ),
    ];
    localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify(normalized),
    );
    writeLanguageCookie(normalized.join(","));
}

function detectBrowserLocales() {
    const candidates = [];
    if (Array.isArray(navigator.languages) && navigator.languages.length) {
        candidates.push(...navigator.languages);
    }
    if (typeof navigator.language === "string" && navigator.language.trim()) {
        candidates.push(navigator.language);
    }
    const htmlLanguage = document.documentElement.lang?.trim();
    if (htmlLanguage) candidates.push(htmlLanguage);
    return [
        ...new Set(
            candidates.map((item) => normalizeLocale(item)).filter(Boolean),
        ),
    ];
}

export function readPreferredLanguages() {
    try {
        const local = JSON.parse(
            localStorage.getItem("cognis_language_priority") || "null",
        );
        if (Array.isArray(local) && local.length) return local;
    } catch {}
    const cookie = readCookie(LANGUAGE_COOKIE);
    if (cookie) {
        const parsed = cookie
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        if (parsed.length) return parsed;
    }
    return [...new Set([...detectBrowserLocales(), DEFAULT_LOCALE])];
}

function detectLocale() {
    const preferredList = readPreferredLanguages();
    if (preferredList?.[0]) return preferredList[0].toLowerCase();
    return DEFAULT_LOCALE;
}

/**
 * Converts a locale value to its normalized language code.
 *
 * @param {string | undefined | null} locale
 * @returns {string | null}
 */
function normalizeLocale(locale) {
    if (typeof locale !== "string") return null;
    const trimmed = locale.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    return lower.split("-")[0];
}

/**
 * Resolves the first preferred locale that is also present in the list of
 * supported locales.
 *
 * Usage:
 *   selectSupportedLanguage(['ja-JP', 'de-DE'], ['en', 'de', 'ja'], 'en'); // 'ja'
 *   selectSupportedLanguage(['pt-BR'], ['en', 'de', 'ja'], 'en'); // 'en'
 *
 * @param {string[] | undefined | null} preferredLanguages
 * @param {string[] | undefined | null} supportedLanguages
 * @param {string} [fallbackLanguage='en']
 * @returns {string}
 */
export function selectSupportedLanguage(
    preferredLanguages,
    supportedLanguages,
    fallbackLanguage = DEFAULT_LOCALE,
) {
    const supportedSet = new Set(
        (supportedLanguages || [])
            .map((item) => normalizeLocale(item))
            .filter(Boolean),
    );
    for (const language of preferredLanguages || []) {
        const normalizedLanguage = normalizeLocale(language);
        if (normalizedLanguage && supportedSet.has(normalizedLanguage)) {
            return normalizedLanguage;
        }
    }
    const normalizedFallback = normalizeLocale(fallbackLanguage);
    return normalizedFallback || DEFAULT_LOCALE;
}

function parseStringsXml(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const map = new Map();
    xml.querySelectorAll("string[name]").forEach((node) => {
        map.set(node.getAttribute("name"), (node.textContent || "").trim());
    });
    return map;
}

async function loadLocaleStrings(locale) {
    const normalized = normalizeLocale(locale);
    if (cache.has(normalized)) return cache.get(normalized);

    const response = await fetch(
        `${STRINGS_BASE_PATH}/${normalized}/strings.xml`,
    );
    if (!response.ok) {
        const error = new Error(
            `Unable to load strings for locale: ${normalized}`,
        );
        error.status = response.status;
        throw error;
    }
    const parsed = parseStringsXml(await response.text());
    cache.set(normalized, parsed);
    return parsed;
}

async function loadModuleStrings(activeLocale, moduleIds) {
    const collected = new Map();
    if (!Array.isArray(moduleIds) || !moduleIds.length) return collected;

    await Promise.all(
        moduleIds.map(async (moduleId) => {
            try {
                const response = await fetch(
                    `/modules/${encodeURIComponent(moduleId)}/strings/${activeLocale}.xml`,
                );
                if (!response.ok) return;
                const parsed = parseStringsXml(await response.text());
                parsed.forEach((value, key) => {
                    if (!key.startsWith(`module.${moduleId}.`)) return;
                    collected.set(key, value);
                });
            } catch {}
        }),
    );

    return collected;
}

async function loadComponentStrings(activeLocale, baseUrls) {
    const collected = new Map();
    if (!Array.isArray(baseUrls) || !baseUrls.length) return collected;

    await Promise.all(
        baseUrls.map(async (baseUrl) => {
            try {
                let response = await fetch(
                    `${baseUrl}/${activeLocale}/strings.xml`,
                );
                if (!response.ok && activeLocale !== DEFAULT_LOCALE) {
                    response = await fetch(
                        `${baseUrl}/${DEFAULT_LOCALE}/strings.xml`,
                    );
                }
                if (!response.ok) return;
                parseStringsXml(await response.text()).forEach((value, key) => {
                    collected.set(key, value);
                });
            } catch {}
        }),
    );

    return collected;
}

export async function createI18n(options = {}) {
    const requested = detectLocale();
    const preferredLanguages = options.preferredLanguages || [
        requested,
        DEFAULT_LOCALE,
    ];
    const normalizedPriority = [
        ...new Set(
            preferredLanguages
                .filter((item) => typeof item === "string")
                .map((item) => normalizeLocale(item))
                .filter(Boolean),
        ),
    ];
    const loadedLocales = new Set();
    const unsupportedLocales = new Set();
    let activeLocale = DEFAULT_LOCALE;
    let strings = new Map();

    for (const locale of normalizedPriority) {
        try {
            const part = await loadLocaleStrings(locale);
            loadedLocales.add(locale);
            if (loadedLocales.size === 1) activeLocale = locale;
            part.forEach((value, key) => {
                if (!strings.has(key)) strings.set(key, value);
            });
        } catch (error) {
            if (error?.status === 404) unsupportedLocales.add(locale);
        }
    }

    if (!strings.size) {
        activeLocale = DEFAULT_LOCALE;
        strings = await loadLocaleStrings(activeLocale);
        loadedLocales.clear();
        loadedLocales.add(DEFAULT_LOCALE);
    }

    const moduleStrings = await loadModuleStrings(
        activeLocale,
        options.moduleIds || [],
    );
    moduleStrings.forEach((value, key) => strings.set(key, value));

    const componentStrings = await loadComponentStrings(
        activeLocale,
        options.componentStringBaseUrls || [],
    );
    componentStrings.forEach((value, key) => strings.set(key, value));

    const persistedLocales = normalizedPriority.filter(
        (locale) => !unsupportedLocales.has(locale),
    );
    setPreferredLanguages(
        persistedLocales.length ? persistedLocales : [DEFAULT_LOCALE],
    );
    document.documentElement.lang = activeLocale;

    return {
        locale: activeLocale,
        t(key) {
            const value = strings.get(key);
            return typeof value === "string" && value.trim() ? value : "";
        },
    };
}

export function applyStaticTranslations(i18n, root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.textContent = value;
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        const key = element.getAttribute("data-i18n-placeholder");
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute("placeholder", value);
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
        const key = element.getAttribute("data-i18n-aria-label");
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute("aria-label", value);
    });

    root.querySelectorAll("[data-i18n-alt]").forEach((element) => {
        const key = element.getAttribute("data-i18n-alt");
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute("alt", value);
    });
}

/**
 * Returns a new i18n resolver backed by `baseI18n` for core strings, with
 * component-specific strings loaded from `stringsBaseUrl` taking precedence.
 * Component strings are kept in a separate map; base strings are accessed via
 * `baseI18n.t()` at lookup time. Falls back to the English file when the
 * locale-specific component file is missing.
 *
 * @param {{ locale: string, t: Function }} baseI18n
 * @param {string|null|undefined} stringsBaseUrl - Base URL for component strings
 * @returns {Promise<{ locale: string, t: Function }>}
 */
export async function extendI18n(baseI18n, stringsBaseUrl) {
    if (!stringsBaseUrl) return baseI18n;

    const extra = await loadComponentStrings(baseI18n.locale, [stringsBaseUrl]);
    const merged = new Map();

    extra.forEach((value, key) => merged.set(key, value));

    return {
        locale: baseI18n.locale,
        t(key) {
            if (merged.has(key)) return merged.get(key);
            return baseI18n.t(key);
        },
    };
}

export function applyDocumentTitle(i18n, key) {
    const value = i18n.t(key);
    if (value) document.title = value;
}
