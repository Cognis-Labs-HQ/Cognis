import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { applyDocumentTitle, createI18n, readPreferredLanguages, setPreferredLanguages } from '../reuse/i18n.js';

const root = document.querySelector('#app');
let languagePriority = readPreferredLanguages();
const i18n = await createI18n({ preferredLanguages: languagePriority });
applyDocumentTitle(i18n, 'ui.page.title.settings');

const DEFAULT_FONT = 'Orbitron';
const DEFAULT_FONT_SIZE = 12;
const FALLBACK_FONTS = [DEFAULT_FONT, 'Inter', 'Arial', 'sans-serif'];

function section(label, content) {
  return `<section class="widget-card"><h3>${label}</h3>${content}</section>`;
}

function toFontFamilyValue(font) {
  if (!font) return 'Orbitron';
  return /^[a-zA-Z0-9-]+$/.test(font) ? font : `"${font.replace(/"/g, '\\"')}"`;
}

function parseSavedFont(fontValue) {
  if (!fontValue || typeof fontValue !== 'string') return 'Orbitron';
  return fontValue.split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Orbitron';
}

async function loadPrefs() {
  const account = localStorage.getItem('cognis_account');
  if (!account) return null;
  const response = await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`);
  const payload = await response.json();
  const raw = payload?.data?.layoutJson;
  return raw ? JSON.parse(raw) : null;
}

async function savePrefs(prefs) {
  const account = localStorage.getItem('cognis_account');
  if (!account) return;
  await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ layout: prefs })
  });
}

async function loadFontsCatalog() {
  await document.fonts.ready;
  const seen = new Set(FALLBACK_FONTS);
  document.fonts.forEach((face) => {
    const family = face.family.replace(/^['"]|['"]$/g, '').trim();
    if (family) seen.add(family);
  });
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

await renderDashboardLayout(root, {
  i18n,
  pageContext: `<h1>${i18n.t('ui.app.settings.page_title')}</h1><p>${i18n.t('ui.app.settings.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.app.settings.toolbar_title')}</h3><ul><li><button disabled>${i18n.t('ui.reuse.menu.profile')}</button></li><li><button disabled>${i18n.t('ui.reuse.appearance')}</button></li></ul>`,
  content: `<article class="docs-viewer">${section(i18n.t('ui.reuse.appearance'), `
      <label>${i18n.t('ui.app.settings.animation')} <select id="pref-animation"><option>none</option><option>fade</option><option>float</option></select></label><br/>
      <label class="font-picker-label">${i18n.t('ui.app.settings.greeting_font')} <div id="pref-font-picker"></div></label>
      <span id="pref-font-preview" style="margin-left:8px;font-size:1.1em;">AaBbCc</span><br/>
      <label>${i18n.t('ui.app.settings.greeting_size')} <button id="pref-font-size-down" class="font-size-btn font-size-btn--down" type="button" aria-label="${i18n.t('ui.app.settings.greeting_size')} -">▼</button> <span id="pref-font-size-value">${DEFAULT_FONT_SIZE} pt</span> <button id="pref-font-size-up" class="font-size-btn font-size-btn--up" type="button" aria-label="${i18n.t('ui.app.settings.greeting_size')} +">▲</button></label>
      <button id="pref-font-reset" class="font-reset-btn" type="button">${i18n.t('ui.app.settings.reset_font')}</button><br/>
      <section><h4>${i18n.t('ui.app.settings.language')}</h4><div class="language-preferences"><div><h5>${i18n.t('ui.app.settings.available_languages')}</h5><table id="available-languages" class="language-table"></table></div><div><h5>${i18n.t('ui.app.settings.preferred_languages')}</h5><table id="preferred-languages" class="language-table"></table></div></div></section>
      <button id="save-prefs">${i18n.t('ui.app.settings.save')}</button>
    `)}</article>`
});

const existingPrefs = await loadPrefs().catch(() => null);
if (Array.isArray(existingPrefs?.languagePriority)) languagePriority = existingPrefs.languagePriority;

const fontOptions = await loadFontsCatalog().catch(() => [...FALLBACK_FONTS]);
const fonts = Array.from(new Set([...FALLBACK_FONTS, ...fontOptions])).sort((a, b) => a.localeCompare(b));

const defaultGreetingFont = parseSavedFont(existingPrefs?.greetingFont);
if (!fonts.includes(defaultGreetingFont)) fonts.unshift(defaultGreetingFont);

const fontPreview = root.querySelector('#pref-font-preview');
const fontPickerContainer = root.querySelector('#pref-font-picker');

function buildFontPicker(container, fontList, initialValue, onChange) {
  let selectedFont = initialValue;
  let isOpen = false;

  const picker = document.createElement('div');
  picker.className = 'font-picker';
  picker.setAttribute('role', 'combobox');
  picker.setAttribute('aria-haspopup', 'listbox');
  picker.setAttribute('aria-expanded', 'false');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'font-picker__trigger';

  const selectedLabel = document.createElement('span');
  selectedLabel.className = 'font-picker__selected';

  const arrow = document.createElement('span');
  arrow.className = 'font-picker__arrow';
  arrow.textContent = '▾';
  arrow.setAttribute('aria-hidden', 'true');

  trigger.append(selectedLabel, arrow);

  const dropdown = document.createElement('ul');
  dropdown.className = 'font-picker__dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  fontList.forEach((font) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('data-value', font);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'font-picker__option';
    btn.textContent = font;
    btn.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;

    btn.addEventListener('click', () => {
      applySelection(font);
      closeDropdown();
    });

    li.append(btn);
    dropdown.append(li);
  });

  function applySelection(font) {
    selectedFont = font;
    selectedLabel.textContent = font;
    selectedLabel.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;
    dropdown.querySelectorAll('li[data-value]').forEach((li) => {
      const isSelected = li.getAttribute('data-value') === font;
      li.querySelector('button').setAttribute('aria-selected', String(isSelected));
    });
    onChange(font);
  }

  function positionDropdown() {
    const rect = trigger.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.minWidth = `${rect.width}px`;
    dropdown.style.zIndex = '9999';
  }

  function openDropdown() {
    isOpen = true;
    positionDropdown();
    dropdown.hidden = false;
    picker.setAttribute('aria-expanded', 'true');
    const activeLi = dropdown.querySelector(`li[data-value="${CSS.escape(selectedFont)}"]`);
    activeLi?.scrollIntoView({ block: 'nearest' });
  }

  function closeDropdown() {
    isOpen = false;
    dropdown.hidden = true;
    picker.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', () => {
    if (isOpen) closeDropdown();
    else openDropdown();
  });

  const listenerController = new AbortController();
  const { signal } = listenerController;

  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target)) closeDropdown();
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) closeDropdown();
  }, { signal });

  window.addEventListener('scroll', closeDropdown, { signal, capture: true });
  window.addEventListener('resize', closeDropdown, { signal });

  picker.append(trigger, dropdown);
  container.append(picker);

  applySelection(selectedFont);

  return {
    getValue: () => selectedFont,
    setValue: (font) => applySelection(font),
    destroy: () => listenerController.abort(),
  };
}

let fontPickerControl = null;

if (fontPickerContainer) {
  fontPickerControl = buildFontPicker(fontPickerContainer, fonts, defaultGreetingFont, () => {
    updatePreview();
  });
}

function updatePreview() {
  if (!fontPreview) return;
  const selected = fontPickerControl?.getValue() || DEFAULT_FONT;
  fontPreview.style.fontFamily = `${toFontFamilyValue(selected)}, Arial, sans-serif`;
}
updatePreview();

const animationSelector = root.querySelector('#pref-animation');
if (animationSelector) animationSelector.value = existingPrefs?.animation || 'none';

const fontSizeValue = root.querySelector('#pref-font-size-value');
const rawStoredSize = Number(existingPrefs?.greetingFontSize || DEFAULT_FONT_SIZE);
// Values below 8 are legacy rem values; convert to pt (1rem ≈ 12pt at default browser zoom).
const normalizedSize = rawStoredSize < 8 ? Math.round(rawStoredSize * 12) : rawStoredSize;
const initialFontSize = Math.max(8, Math.min(24, Math.round(normalizedSize)));
let greetingFontSize = initialFontSize;
if (fontSizeValue) fontSizeValue.textContent = `${greetingFontSize} pt`;

function setFontSize(nextSize) {
  greetingFontSize = Math.max(8, Math.min(24, Math.round(nextSize)));
  if (fontSizeValue) fontSizeValue.textContent = `${greetingFontSize} pt`;
  if (fontPreview) fontPreview.style.fontSize = `${greetingFontSize}pt`;
}

root.querySelector('#pref-font-size-down')?.addEventListener('click', () => setFontSize(greetingFontSize - 1));
root.querySelector('#pref-font-size-up')?.addEventListener('click', () => setFontSize(greetingFontSize + 1));
setFontSize(greetingFontSize);

root.querySelector('#pref-font-reset')?.addEventListener('click', () => {
  fontPickerControl?.setValue(DEFAULT_FONT);
  setFontSize(DEFAULT_FONT_SIZE);
  updatePreview();
});

root.querySelector('#save-prefs')?.addEventListener('click', async () => {
  const selectedFont = fontPickerControl?.getValue() || DEFAULT_FONT;
  const prefs = {
    animation: root.querySelector('#pref-animation')?.value || 'none',
    greetingFont: toFontFamilyValue(selectedFont),
    greetingFontSize,
    languagePriority
  };
  await savePrefs(prefs);
  setPreferredLanguages(prefs.languagePriority);
  localStorage.setItem('cognis_ui_preferences', JSON.stringify(prefs));
  alert(i18n.t('ui.app.settings.saved_alert'));
  window.location.reload();
});

async function loadLanguagesCatalog() {
  const response = await apiFetch('/api/v1/system/languages');
  const payload = await response.json();
  return payload.data || [];
}

function renderLanguageTables(catalog) { /* unchanged below */
  const preferred = root.querySelector('#preferred-languages');
  const available = root.querySelector('#available-languages');
  if (!preferred || !available) return;
  const preferredSet = new Set(languagePriority);
  preferred.innerHTML = languagePriority.map((iso) => {
    const match = catalog.find((item) => item.iso_code === iso);
    const label = match ? `${match.name} (${iso})` : iso;
    return `<tr draggable="true" data-lang-row="${iso}"><td>${label}</td><td class="drag-handle">⬍</td></tr>`;
  }).join('');
  available.innerHTML = catalog.filter((item) => !preferredSet.has(item.iso_code)).map((item) => `<tr draggable="true" data-lang-row="${item.iso_code}"><td>${item.name} (${item.iso_code})</td><td class="drag-handle">⬍</td></tr>`).join('');
}

const languageCatalog = await loadLanguagesCatalog().catch(() => [{ iso_code: 'en', name: 'English' }]);
renderLanguageTables(languageCatalog);
let dragLanguage = null;
root.addEventListener('dragstart', (event) => {
  const row = event.target.closest('tr[data-lang-row]');
  if (!row) return;
  dragLanguage = row.getAttribute('data-lang-row');
  event.dataTransfer?.setData('text/plain', dragLanguage || '');
});

function clearDropMarkers() {
  root.querySelectorAll('.drop-target-before, .drop-target-after').forEach((row) => {
    row.classList.remove('drop-target-before');
    row.classList.remove('drop-target-after');
  });
}

root.addEventListener('dragover', (event) => {
  const zone = event.target.closest('#available-languages, #preferred-languages, tr[data-lang-row]');
  if (!zone) return;
  event.preventDefault();
  clearDropMarkers();

  const row = event.target.closest('tr[data-lang-row]');
  if (!row) return;
  const rect = row.getBoundingClientRect();
  const isAfter = event.clientY > rect.top + rect.height / 2;
  row.classList.add(isAfter ? 'drop-target-after' : 'drop-target-before');
});

root.addEventListener('drop' , (event) => {
  const targetTable = event.target.closest('#available-languages, #preferred-languages');
  const targetRow = event.target.closest('tr[data-lang-row]');
  const targetIsAfter = Boolean(targetRow?.classList.contains('drop-target-after'));
  clearDropMarkers();
  const lang = dragLanguage || event.dataTransfer?.getData('text/plain');
  if (!lang) return;

  if (targetTable?.id === 'preferred-languages') {
    languagePriority = languagePriority.filter((item) => item !== lang);
    if (targetRow) {
      const targetIso = targetRow.getAttribute('data-lang-row');
      const index = languagePriority.indexOf(targetIso);
      if (index >= 0) languagePriority.splice(targetIsAfter ? index + 1 : index, 0, lang);
      else languagePriority.push(lang);
    } else {
      languagePriority.push(lang);
    }
  }

  if (targetTable?.id === 'available-languages') {
    if (lang !== 'en') languagePriority = languagePriority.filter((item) => item !== lang);
  }

  languagePriority = [...new Set(languagePriority)];
  if (!languagePriority.includes('en')) languagePriority.push('en');
  renderLanguageTables(languageCatalog);
  dragLanguage = null;
});
