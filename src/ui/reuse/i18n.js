/**
  * Lightweight i18n layer backed by per-locale strings.xml files.
  *
  * - createI18n(options)              — loads locale strings for the user's preferred language(s)
  *                                      and returns a `{ t(key) }` resolver.
  * - applyStaticTranslations(i18n)    — resolves data-i18n / data-i18n-placeholder /
  *                                      data-i18n-aria-label / data-i18n-alt attributes in the DOM.
  * - applyDocumentTitle(i18n, key)    — sets document.title from a locale key.
  * - readPreferredLanguages()         — returns the stored language-priority array.
  * - setPreferredLanguages(languages) — persists a language-priority array to localStorage + cookie.
  *
  * Usage:
  *   const i18n = await createI18n({ preferredLanguages: ['es', 'en'] });
  *   i18n.t('ui.reuse.generic.save');   // → 'Guardar'
  *   applyStaticTranslations(i18n);
  */
const DEFAULT_LOCALE = 'en';
const STRINGS_BASE_PATH = '/static/languages';

const cache = new Map();

const LANGUAGE_COOKIE = 'cognis_lang_priority';

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeLanguageCookie(locale) {
    document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function setPreferredLanguages(languages) {
    const normalized = [...new Set((languages || [DEFAULT_LOCALE]).map((item) => normalizeLocale(item)).filter(Boolean))];
    localStorage.setItem('cognis_language_priority', JSON.stringify(normalized));
    writeLanguageCookie(normalized.join(','));
}

function detectBrowserLocale() {
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) return htmlLang.toLowerCase();
    const browserLocale = navigator.language || DEFAULT_LOCALE;
    return browserLocale.toLowerCase();
}

export function readPreferredLanguages() {
    try {
        const local = JSON.parse(localStorage.getItem('cognis_language_priority') || 'null');
        if (Array.isArray(local) && local.length) return local;
    } catch {}
    const cookie = readCookie(LANGUAGE_COOKIE);
    if (cookie) {
        const parsed = cookie.split(',').map((item) => item.trim()).filter(Boolean);
        if (parsed.length) return parsed;
    }
    return [detectBrowserLocale(), DEFAULT_LOCALE];
}


function detectLocale() {
    const preferredList = readPreferredLanguages();
    if (preferredList?.[0]) return preferredList[0].toLowerCase();
    return detectBrowserLocale();
}

function normalizeLocale(locale) {
    if (typeof locale !== 'string') return null;
    const trimmed = locale.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    return lower.split('-')[0];
}

function parseStringsXml(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    const map = new Map();
    xml.querySelectorAll('string[name]').forEach((node) => {
        map.set(node.getAttribute('name'), (node.textContent || '').trim());
    });
    return map;
}

async function loadLocaleStrings(locale) {
    const normalized = normalizeLocale(locale);
    if (cache.has(normalized)) return cache.get(normalized);

    const response = await fetch(`${STRINGS_BASE_PATH}/${normalized}/strings.xml`);
    if (!response.ok) throw new Error(`Unable to load strings for locale: ${normalized}`);
    const parsed = parseStringsXml(await response.text());
    cache.set(normalized, parsed);
    return parsed;
}

async function loadModuleStrings(activeLocale, moduleIds) {
    const collected = new Map();
    if (!Array.isArray(moduleIds) || !moduleIds.length) return collected;

    await Promise.all(moduleIds.map(async (moduleId) => {
        try {
            const response = await fetch(`/modules/${encodeURIComponent(moduleId)}/strings/${activeLocale}.xml`);
            if (!response.ok) return;
            const parsed = parseStringsXml(await response.text());
            parsed.forEach((value, key) => {
                if (!key.startsWith(`module.${moduleId}.`)) return;
                collected.set(key, value);
            });
        } catch {}
    }));

    return collected;
}

export async function createI18n(options = {}) {
    const requested = detectLocale();
    const preferredLanguages = options.preferredLanguages || [requested, DEFAULT_LOCALE];
    const normalizedPriority = [...new Set(preferredLanguages.filter((item) => typeof item === 'string').map((item) => normalizeLocale(item)).filter(Boolean))];
    let activeLocale = normalizedPriority[0] || DEFAULT_LOCALE;
    let strings = new Map();

    for (const locale of normalizedPriority) {
        try {
            const part = await loadLocaleStrings(locale);
            part.forEach((value, key) => { if (!strings.has(key)) strings.set(key, value); });
            if (strings.size && activeLocale === normalizedPriority[0]) activeLocale = locale;
        } catch {}
    }

    if (!strings.size) {
        activeLocale = DEFAULT_LOCALE;
        strings = await loadLocaleStrings(activeLocale);
    }

    const moduleStrings = await loadModuleStrings(activeLocale, options.moduleIds || []);
    moduleStrings.forEach((value, key) => strings.set(key, value));

    setPreferredLanguages(normalizedPriority);
    document.documentElement.lang = activeLocale;

    return {
        locale: activeLocale,
        t(key) {
            const value = strings.get(key);
            return typeof value === 'string' && value.trim() ? value : '';
        }
    };
}

export function applyStaticTranslations(i18n, root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.textContent = value;
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute('placeholder', value);
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        const key = element.getAttribute('data-i18n-aria-label');
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute('aria-label', value);
    });


    root.querySelectorAll('[data-i18n-alt]').forEach((element) => {
        const key = element.getAttribute('data-i18n-alt');
        if (!key) return;
        const value = i18n.t(key);
        if (value) element.setAttribute('alt', value);
    });
}

export function applyDocumentTitle(i18n, key) {
    const value = i18n.t(key);
    if (value) document.title = value;
}
