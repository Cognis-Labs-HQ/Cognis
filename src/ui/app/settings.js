import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { applyDocumentTitle, createI18n, readPreferredLanguages, setPreferredLanguages } from '../reuse/i18n.js';

const root = document.querySelector('#app');
let languagePriority = readPreferredLanguages();
const i18n = await createI18n({ preferredLanguages: languagePriority });
applyDocumentTitle(i18n, 'ui.page.title.settings');

function section(label, content) {
  return `<section class="widget-card"><h3>${label}</h3>${content}</section>`;
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
  const response = await apiFetch('/api/v1/system/fonts');
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

await renderDashboardLayout(root, {
  i18n,
  pageContext: `<h1>${i18n.t('ui.app.settings.page_title')}</h1><p>${i18n.t('ui.app.settings.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.app.settings.toolbar_title')}</h3><ul><li><button disabled>${i18n.t('ui.reuse.menu.profile')}</button></li><li><button disabled>${i18n.t('ui.reuse.appearance')}</button></li></ul>`,
  content: `<article class="docs-viewer">${section(i18n.t('ui.reuse.appearance'), `
      <label>${i18n.t('ui.app.settings.animation')} <select id="pref-animation"><option>none</option><option>fade</option><option>float</option></select></label><br/>
      <label>${i18n.t('ui.app.settings.greeting_font')} <select id="pref-font"></select></label><br/>
      <label>${i18n.t('ui.app.settings.greeting_size')} <input id="pref-font-size" type="number" min="0.8" max="2" step="0.05"/></label><br/>
      <section><h4>${i18n.t('ui.app.settings.language')}</h4><div class="language-preferences"><div><h5>${i18n.t('ui.app.settings.available_languages')}</h5><table id="available-languages" class="language-table"></table></div><div><h5>${i18n.t('ui.app.settings.preferred_languages')}</h5><table id="preferred-languages" class="language-table"></table></div></div></section>
      <button id="save-prefs">${i18n.t('ui.app.settings.save')}</button>
    `)}</article>`
});

const existingPrefs = await loadPrefs().catch(() => null);
if (Array.isArray(existingPrefs?.languagePriority)) languagePriority = existingPrefs.languagePriority;
const fontOptions = await loadFontsCatalog().catch(() => ['Orbitron', 'Inter', 'Arial', 'sans-serif']);

const fontSelector = root.querySelector('#pref-font');
if (fontSelector) {
  const fonts = Array.from(new Set(['Orbitron', ...fontOptions]));
  fontSelector.innerHTML = fonts.map((font) => `<option value="${font}">${font}</option>`).join('');
}

const defaultGreetingFont = existingPrefs?.greetingFont || 'Orbitron';
if (fontSelector) fontSelector.value = defaultGreetingFont;
const animationSelector = root.querySelector('#pref-animation');
if (animationSelector) animationSelector.value = existingPrefs?.animation || 'none';
const fontSizeInput = root.querySelector('#pref-font-size');
if (fontSizeInput) fontSizeInput.value = String(existingPrefs?.greetingFontSize || 1.4);

root.querySelector('#save-prefs')?.addEventListener('click', async () => {
  const prefs = {
    animation: root.querySelector('#pref-animation')?.value || 'none',
    greetingFont: root.querySelector('#pref-font')?.value || 'Orbitron',
    greetingFontSize: Number(root.querySelector('#pref-font-size')?.value || 1.4),
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

function renderLanguageTables(catalog) {
  const preferred = root.querySelector('#preferred-languages');
  const available = root.querySelector('#available-languages');
  if (!preferred || !available) return;
  const preferredSet = new Set(languagePriority);
  preferred.innerHTML = languagePriority.map((iso) => {
    const match = catalog.find((item) => item.iso_code === iso);
    const label = match ? `${match.name} (${iso})` : iso;
    return `<tr draggable=\"true\" data-lang-row=\"${iso}\"><td>${label}</td><td class=\"drag-handle\">⬍</td></tr>`;
  }).join('');
  available.innerHTML = catalog.filter((item) => !preferredSet.has(item.iso_code)).map((item) => `<tr draggable=\"true\" data-lang-row=\"${item.iso_code}\"><td>${item.name} (${item.iso_code})</td><td class=\"drag-handle\">⬍</td></tr>`).join('');
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
