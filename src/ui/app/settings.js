import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { applyDocumentTitle, createI18n, readPreferredLanguages, setPreferredLanguages } from '../reuse/i18n.js';
import { toFontFamilyValue, initFontPrefs, DEFAULT_FONT_SIZE } from './settings-font-prefs.js';
import { initLanguagePrefs } from './settings-language-prefs.js';

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
  if (!response.ok) return null;
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

await renderDashboardLayout(root, {
  i18n,
  pageContext: `<h1>${i18n.t('ui.app.settings.page_title')}</h1><p>${i18n.t('ui.app.settings.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.app.settings.page_title')}</h3><ul><li><button disabled>${i18n.t('ui.app.settings.sidebar.preferences')}</button></li></ul>`,
  content: `<article class="docs-viewer">${section(i18n.t('ui.reuse.appearance'), `
      <label class="animation-slider-label">
        ${i18n.t('ui.app.settings.animation')}
        <div class="animation-slider-track">
          <span class="animation-slider-tick">${i18n.t('ui.app.settings.animation_off')}</span>
          <span class="animation-slider-tick">${i18n.t('ui.app.settings.animation_fade')}</span>
          <span class="animation-slider-tick">${i18n.t('ui.app.settings.animation_float')}</span>
        </div>
        <input type="range" id="pref-animation" class="animation-slider" min="0" max="2" step="1" />
      </label><br/>
      <label class="font-picker-label">${i18n.t('ui.app.settings.font')} <div id="pref-font-picker"></div></label>
      <span id="pref-font-preview" style="margin-left:8px;font-size:1.1em;">AaBbCc</span><br/>
      <label>${i18n.t('ui.app.settings.font_size')} <button id="pref-font-size-down" class="font-size-btn" type="button" aria-label="${i18n.t('ui.app.settings.font_size')} -">▼</button> <span id="pref-font-size-value">${DEFAULT_FONT_SIZE} pt</span> <button id="pref-font-size-up" class="font-size-btn" type="button" aria-label="${i18n.t('ui.app.settings.font_size')} +">▲</button></label>
      <button id="pref-font-reset" class="font-reset-btn" type="button">${i18n.t('ui.app.settings.reset_font')}</button><br/>
      <section><h4>${i18n.t('ui.app.settings.language')}</h4><div class="language-preferences"><div><h5>${i18n.t('ui.app.settings.available_languages')}</h5><table id="available-languages" class="language-table"></table></div><div><h5>${i18n.t('ui.app.settings.preferred_languages')}</h5><table id="preferred-languages" class="language-table"></table></div></div></section>
      <button id="save-prefs">${i18n.t('ui.app.settings.save')}</button>
    `)}</article>`
});

const existingPrefs = await loadPrefs().catch(() => null);
if (Array.isArray(existingPrefs?.languagePriority)) languagePriority = existingPrefs.languagePriority;

// Map between the stored string value and the slider integer position.
const ANIMATION_LEVELS = ['none', 'fade', 'float'];

const animationSlider = root.querySelector('#pref-animation');
if (animationSlider) {
  const currentAnim = existingPrefs?.animation || 'none';
  const idx = ANIMATION_LEVELS.indexOf(currentAnim);
  animationSlider.value = idx >= 0 ? String(idx) : '0';
}

const fontPrefs = initFontPrefs(root, { existingPrefs, i18n });
await fontPrefs.init();

const languagePrefs = initLanguagePrefs(root, languagePriority);
await languagePrefs.init();

root.querySelector('#save-prefs')?.addEventListener('click', async () => {
  const selectedFont = fontPrefs.getFont();
  const sliderVal = parseInt(root.querySelector('#pref-animation')?.value ?? '0', 10);
  const prefs = {
    animation: ANIMATION_LEVELS[sliderVal] || 'none',
    appFont: toFontFamilyValue(selectedFont),
    appFontSize: fontPrefs.getFontSize(),
    languagePriority: languagePrefs.getPriority()
  };
  await savePrefs(prefs);
  setPreferredLanguages(prefs.languagePriority);
  localStorage.setItem('cognis_ui_preferences', JSON.stringify(prefs));
  alert(i18n.t('ui.app.settings.saved_alert'));
  window.location.reload();
});
