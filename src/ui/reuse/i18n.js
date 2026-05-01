const DEFAULT_LOCALE = 'en';
const STRINGS_BASE_PATH = '/dashboard/static/public/strings';

const cache = new Map();

function detectLocale() {
  const htmlLang = document.documentElement.lang?.trim();
  if (htmlLang) return htmlLang.toLowerCase();
  const browserLocale = navigator.language || DEFAULT_LOCALE;
  return browserLocale.toLowerCase();
}

function normalizeLocale(locale) {
  const lower = locale.toLowerCase();
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

  const response = await fetch(`${STRINGS_BASE_PATH}/${normalized}.xml`);
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
  let activeLocale = normalizeLocale(requested);
  let strings;

  try {
    strings = await loadLocaleStrings(activeLocale);
  } catch {
    activeLocale = DEFAULT_LOCALE;
    strings = await loadLocaleStrings(activeLocale);
  }

  const moduleStrings = await loadModuleStrings(activeLocale, options.moduleIds || []);
  moduleStrings.forEach((value, key) => strings.set(key, value));

  document.documentElement.lang = activeLocale;

  return {
    locale: activeLocale,
    t(key) {
      return strings.get(key);
    }
  };
}

export function applyStaticTranslations(i18n, root = document) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (!key) return;
    element.textContent = i18n.t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (!key) return;
    element.setAttribute('placeholder', i18n.t(key));
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria-label');
    if (!key) return;
    element.setAttribute('aria-label', i18n.t(key));
  });
}


export function applyDocumentTitle(i18n, key) {
  const value = i18n.t(key);
  if (value) document.title = value;
}
