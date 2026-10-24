/**
 * Lightweight i18n layer backed by per-locale strings.xml files.
 *
 * - createI18n(options)              — loads locale strings for the user's preferred language(s)
 *                                      and returns a `{ t(key) }` resolver.
 *                                      Pass `componentStringBaseUrls` to merge additional per-component
 *                                      strings alongside the core locale file. Missing or empty
 *                                      locale values fall back to English XML; unresolved keys throw.
 *                                      Set `persistLocale: false` for background copy that must not
 *                                      change language preferences, cookies or document language.
 * - extendI18n(baseI18n, stringsBaseUrl) — returns a new resolver with core strings from
 *                                          `baseI18n` merged with component strings from `stringsBaseUrl`.
 * - applyStaticTranslations(i18n)    — resolves data-i18n / data-i18n-placeholder /
 *                                      data-i18n-aria-label / data-i18n-alt attributes in the DOM.
 * - applyDocumentTitle(i18n, key)    — sets document.title from a locale key.
 * - readPreferredLanguages()         — returns runtime language priority using browser/system
 *                                      order until the user manually customizes language priority.
 * - readBrowserLocales()             — returns the normalized locale codes from the browser/system.
 * - setPreferredLanguages(languages) — persists a language-priority array to localStorage + cookie,
 *                                      optionally marking it as a manual override.
 *
 * Usage:
 *   const i18n = await createI18n({ preferredLanguages: ['es', 'en'], componentStringBaseUrls: ['/static/my-component/languages'] });
 *   i18n.t('ui.reuse.save');   // → 'Guardar'
 *   applyStaticTranslations(i18n);
 */
import { apiFetch, requestTargetsApi } from "./api-client.js";

export const DEFAULT_LOCALE = "en";
const STRINGS_BASE_PATH = "/static/languages";

const cache = new Map();
const stringRequestCache = new Map();
const STRING_REQUEST_TIMEOUT_MS = 15_000;

async function fetchStrings(path) {
    let request = stringRequestCache.get(path);
    if (!request) {
        const requestFunction = requestTargetsApi(path) ? apiFetch : fetch;
        request = requestFunction(path, {
            signal: globalThis.AbortSignal?.timeout?.(
                STRING_REQUEST_TIMEOUT_MS,
            ),
        }).finally(() => stringRequestCache.delete(path));
        stringRequestCache.set(path, request);
    }
    return (await request).clone();
}

const LANGUAGE_COOKIE = "cognis_lang_priority";
const LANGUAGE_PRIORITY_STORAGE_KEY = "cognis_language_priority";
const LANGUAGE_PRIORITY_MODE_STORAGE_KEY = "cognis_language_priority_mode";
const LANGUAGE_PRIORITY_MODE_AUTO = "auto";
const LANGUAGE_PRIORITY_MODE_MANUAL = "manual";

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeLanguageCookie(locale) {
    document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readLanguagePriorityMode() {
    if (typeof localStorage === "undefined") {
        return LANGUAGE_PRIORITY_MODE_AUTO;
    }
    const storedMode = localStorage.getItem(LANGUAGE_PRIORITY_MODE_STORAGE_KEY);
    return storedMode === LANGUAGE_PRIORITY_MODE_MANUAL
        ? LANGUAGE_PRIORITY_MODE_MANUAL
        : LANGUAGE_PRIORITY_MODE_AUTO;
}

function normalizeLanguagePriority(languages, supportedLanguages) {
    const supportedSet = Array.isArray(supportedLanguages)
        ? new Set(
              supportedLanguages
                  .map((item) => normalizeLocale(item))
                  .filter(Boolean),
          )
        : null;
    const normalized = [];
    for (const language of languages || []) {
        const normalizedLanguage = normalizeLocale(language);
        if (!normalizedLanguage) continue;
        if (supportedSet && !supportedSet.has(normalizedLanguage)) continue;
        if (normalized.includes(normalizedLanguage)) continue;
        normalized.push(normalizedLanguage);
    }
    if (!normalized.includes(DEFAULT_LOCALE)) {
        normalized.push(DEFAULT_LOCALE);
    }
    return normalized;
}

export function sanitizeLanguagePriority(languages, supportedLanguages) {
    return normalizeLanguagePriority(languages, supportedLanguages);
}

export function setPreferredLanguages(languages, options = {}) {
    const normalized = normalizeLanguagePriority(languages);
    const nextMode =
        options.mode === LANGUAGE_PRIORITY_MODE_MANUAL
            ? LANGUAGE_PRIORITY_MODE_MANUAL
            : options.mode === LANGUAGE_PRIORITY_MODE_AUTO
              ? LANGUAGE_PRIORITY_MODE_AUTO
              : readLanguagePriorityMode();
    localStorage.setItem(
        LANGUAGE_PRIORITY_STORAGE_KEY,
        JSON.stringify(normalized),
    );
    localStorage.setItem(LANGUAGE_PRIORITY_MODE_STORAGE_KEY, nextMode);
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

function readStoredPreferredLanguages() {
    try {
        const localValue = JSON.parse(
            localStorage.getItem(LANGUAGE_PRIORITY_STORAGE_KEY) || "null",
        );
        if (Array.isArray(localValue) && localValue.length) {
            return localValue;
        }
    } catch {}
    const cookieValue = readCookie(LANGUAGE_COOKIE);
    if (!cookieValue) return [];
    return cookieValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * Builds runtime language priority from browser/system preferences until the
 * user manually customizes language order, after which stored preferences
 * become authoritative.
 *
 * Usage:
 *   buildLanguagePriority(['de-DE'], ['ja', 'en']); // ['de', 'ja', 'en']
 *
 * @param {string[] | undefined | null} browserLanguages
 * @param {string[] | undefined | null} storedLanguages
 * @param {{ mode?: 'auto' | 'manual' }} [options]
 * @returns {string[]}
 */
export function buildLanguagePriority(
    browserLanguages,
    storedLanguages,
    options = {},
) {
    const isManual =
        options.mode === LANGUAGE_PRIORITY_MODE_MANUAL ||
        (options.mode == null &&
            readLanguagePriorityMode() === LANGUAGE_PRIORITY_MODE_MANUAL);
    return normalizeLanguagePriority(
        isManual
            ? storedLanguages || []
            : [...(browserLanguages || []), ...(storedLanguages || [])],
    );
}

export function readBrowserLocales() {
    return detectBrowserLocales();
}

export function readPreferredLanguages() {
    return buildLanguagePriority(
        detectBrowserLocales(),
        readStoredPreferredLanguages(),
        { mode: readLanguagePriorityMode() },
    );
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

async function readTranslationBundle(path) {
    const response = await fetchStrings(path);
    if (!response.ok) {
        throw Object.assign(new Error("translation_bundle_unavailable"), {
            status: response.status,
        });
    }
    return parseStringsXml(await response.text());
}

async function loadLocaleStrings(locale) {
    const normalized = normalizeLocale(locale);
    if (cache.has(normalized)) return cache.get(normalized);

    const parsed = await readTranslationBundle(
        `${STRINGS_BASE_PATH}/${normalized}/strings.xml`,
    );
    cache.set(normalized, parsed);
    return parsed;
}

async function loadLocalizedStrings(activeLocale, pathForLocale) {
    const locales = [...new Set([DEFAULT_LOCALE, activeLocale])];
    const bundles = await Promise.all(
        locales.map(async (locale) => {
            const path = pathForLocale(locale);
            try {
                return await readTranslationBundle(path);
            } catch (error) {
                console.error("[i18n] translation_bundle_load_failed", {
                    component: "core",
                    operation: "loadTranslationBundle",
                    locale,
                    path,
                    status: error?.status,
                    errorName: error?.name,
                });
                return new Map();
            }
        }),
    );
    const collected = new Map();
    for (const bundle of bundles) {
        for (const [key, value] of bundle) {
            if (value.trim()) collected.set(key, value);
        }
    }
    return collected;
}

async function loadModuleStrings(activeLocale, moduleIds) {
    if (!Array.isArray(moduleIds)) return new Map();
    const bundles = await Promise.all(
        moduleIds.map(async (moduleId) => {
            const strings = await loadLocalizedStrings(
                activeLocale,
                (locale) =>
                    `/modules/${encodeURIComponent(moduleId)}/strings/${locale}.xml`,
            );
            return [...strings].filter(([key]) =>
                key.startsWith(`module.${moduleId}.`),
            );
        }),
    );
    return new Map(bundles.flat());
}

async function loadComponentStrings(activeLocale, baseUrls) {
    if (!Array.isArray(baseUrls)) return new Map();
    const bundles = await Promise.all(
        baseUrls.map((baseUrl) =>
            loadLocalizedStrings(
                activeLocale,
                (locale) => `${baseUrl}/${locale}/strings.xml`,
            ),
        ),
    );
    return new Map(bundles.flatMap((bundle) => [...bundle]));
}

function requireTranslation(value, key) {
    if (typeof value === "string" && value.trim()) return value;
    throw Object.assign(new Error(`missing_translation:${key}`), {
        code: "missing_translation",
        key,
    });
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

    const resolutionLocales = [
        ...new Set([...normalizedPriority, DEFAULT_LOCALE]),
    ];
    for (const locale of resolutionLocales) {
        try {
            const part = await loadLocaleStrings(locale);
            loadedLocales.add(locale);
            if (loadedLocales.size === 1) activeLocale = locale;
            part.forEach((value, key) => {
                if (!strings.get(key)?.trim() && value.trim())
                    strings.set(key, value);
            });
        } catch (error) {
            console.error("[i18n] translation_bundle_load_failed", {
                component: "core",
                operation: "loadCoreTranslationBundle",
                locale,
                status: error?.status,
                errorName: error?.name,
            });
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

    if (options.persistLocale !== false) {
        const persistedLocales = normalizedPriority.filter(
            (locale) => !unsupportedLocales.has(locale),
        );
        setPreferredLanguages(
            persistedLocales.length ? persistedLocales : [DEFAULT_LOCALE],
        );
        document.documentElement.lang = activeLocale;
    }

    return {
        locale: activeLocale,
        t(key) {
            const value = strings.get(key);
            return requireTranslation(value, key);
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
 * preferred-locale key is absent or empty. Missing English fallback keys throw
 * `missing_translation:<key>`; extending a resolver does not change language preferences.
 *
 * @param {{ locale: string, t: Function }} baseI18n
 * @param {string|string[]|null|undefined} stringsBaseUrl - Base URL or URLs for component strings
 * @returns {Promise<{ locale: string, t: Function }>}
 */
export async function extendI18n(baseI18n, stringsBaseUrl) {
    const baseUrls = Array.isArray(stringsBaseUrl)
        ? stringsBaseUrl.filter(
              (entry) => typeof entry === "string" && entry.length > 0,
          )
        : typeof stringsBaseUrl === "string" && stringsBaseUrl.length > 0
          ? [stringsBaseUrl]
          : [];
    const extra = await loadComponentStrings(baseI18n.locale, baseUrls);
    return {
        locale: baseI18n.locale,
        t(key) {
            return requireTranslation(
                extra.has(key) ? extra.get(key) : baseI18n.t(key),
                key,
            );
        },
    };
}

export function applyDocumentTitle(i18n, key) {
    const value = i18n.t(key);
    if (value) document.title = value;
}
