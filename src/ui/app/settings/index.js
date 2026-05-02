import { renderDashboardLayout } from '../../layouts/dashboard-layout.js';
import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n, readPreferredLanguages, setPreferredLanguages } from '../../reuse/i18n.js';
import { applyTheme, persistTheme } from '../../reuse/theme-toggle.js';
import { toFontFamilyValue, initFontPrefs, DEFAULT_FONT_SIZE } from './font-prefs.js';
import { initLanguagePrefs } from './language-prefs.js';
import { createUnsavedChangesBar } from '../../reuse/unsaved-changes.js';

const root = document.querySelector('#app');
let languagePriority = readPreferredLanguages();
const i18n = await createI18n({ preferredLanguages: languagePriority });
applyDocumentTitle(i18n, 'ui.page.title.settings');

function section(label, content) {
  return `<section class="widget-card"><h2>${label}</h2>${content}</section>`;
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

const appearanceContent = `
  <div class="content-section" data-section="appearance">
    ${section(i18n.t('ui.reuse.appearance'), `
      <div class="font-heading-row">
        <h3>${i18n.t('ui.app.settings.font_heading')}</h3>
        <button id="pref-font-reset" type="button" disabled>${i18n.t('ui.reuse.generic.reset')}</button>
      </div>
      <div class="font-picker-row">
        <label class="font-picker-label">
          ${i18n.t('ui.app.settings.font')}
          <div id="pref-font-picker"></div>
        </label>
        <div class="font-size-stepper">
          <button id="pref-font-size-up" class="font-size-btn" type="button" aria-label="${i18n.t('ui.app.settings.font_size')} +">▲</button>
          <span id="pref-font-size-value">${DEFAULT_FONT_SIZE} pt</span>
          <button id="pref-font-size-down" class="font-size-btn" type="button" aria-label="${i18n.t('ui.app.settings.font_size')} -">▼</button>
        </div>
      </div>
      <div class="font-preview-box">
        <h4>${i18n.t('ui.app.settings.font_preview')}</h4>
        <span id="pref-font-preview">AaBbCc</span>
      </div>
      <div class="theme-subsection">
        <h3>${i18n.t('ui.app.settings.theme')}</h3>
        <div class="theme-selector" id="pref-theme-selector">
          <button type="button" class="theme-btn" data-theme-value="dark">${i18n.t('ui.app.settings.theme_dark')}</button>
          <button type="button" class="theme-btn" data-theme-value="light">${i18n.t('ui.app.settings.theme_light')}</button>
        </div>
      </div>
    `)}
  </div>`;

const languageContent = `
  <div class="content-section" data-section="language">
    ${section(i18n.t('ui.reuse.language'), `
      <div class="language-preferences">
        <div>
          <h3>${i18n.t('ui.app.settings.available_languages')}</h3>
          <table id="available-languages" class="language-table"></table>
        </div>
        <div>
          <h3>${i18n.t('ui.app.settings.preferred_languages')}</h3>
          <table id="preferred-languages" class="language-table"></table>
        </div>
      </div>
    `)}
  </div>`;

const advancedContent = `
  <div class="content-section" data-section="advanced">
    ${section(i18n.t('ui.app.settings.advanced'), `
      <h3>${i18n.t('ui.app.settings.preferences')}</h3>
      <pre id="prefs-dump" class="prefs-dump">${i18n.t('ui.app.settings.prefs_loading')}</pre>
    `)}
  </div>`;

await renderDashboardLayout(root, {
  i18n,
  pageContext: `<h1>${i18n.t('ui.app.settings.page_title')}</h1><p>${i18n.t('ui.app.settings.page_subtitle')}</p>`,
  toolbar: `
    <h2>${i18n.t('ui.app.settings.page_title')}</h2>
    <ul>
      <li><button data-section="appearance">${i18n.t('ui.reuse.appearance')}</button></li>
      <li><button data-section="language">${i18n.t('ui.reuse.language')}</button></li>
      <li><button data-section="advanced">${i18n.t('ui.app.settings.advanced')}</button></li>
    </ul>
  `,
  content: `<article class="content-panel">${appearanceContent}${languageContent}${advancedContent}</article>`,
  floatingToolbar: `
    <span>${i18n.t('ui.reuse.unsaved_changes')}</span>
    <button class="btn-cancel btn-animated" type="button" data-action="discard">${i18n.t('ui.reuse.generic.discard')}</button>
    <button class="btn-confirm btn-animated" type="button" data-action="save">${i18n.t('ui.reuse.generic.save')}</button>
  `,
});

const DEFAULT_SECTION = 'appearance';
const DEFAULT_THEME = 'dark';

function applyToolbarActiveState() {
  const hash = window.location.hash.slice(1) || DEFAULT_SECTION;
  root.querySelectorAll('.toolbar button[data-section]').forEach((btn) => {
    const isActive = btn.dataset.section === hash;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  root.querySelectorAll('.content-section[data-section]').forEach((sec) => {
    sec.classList.toggle('active', sec.dataset.section === hash);
  });

  // The floating theme toggle is redundant on the Appearance page (it has its own selector).
  const themeToggle = document.querySelector('#theme-toggle');
  if (themeToggle) themeToggle.hidden = (hash === DEFAULT_SECTION);
}

root.querySelectorAll('.toolbar button[data-section]').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.location.hash = btn.dataset.section;
  });
});

window.addEventListener('hashchange', applyToolbarActiveState);

applyToolbarActiveState();

const floatingToolbarEl = root.querySelector('.floating-toolbar');

const existingPrefs = await loadPrefs().catch(() => null);
if (Array.isArray(existingPrefs?.languagePriority)) languagePriority = existingPrefs.languagePriority;

const prefsDumpEl = root.querySelector('#prefs-dump');
if (prefsDumpEl) {
  prefsDumpEl.textContent = existingPrefs != null
    ? JSON.stringify(existingPrefs, null, 2)
    : 'null';
}

const savedMode = document.body.getAttribute('data-theme') || DEFAULT_THEME;

function initThemePrefs({ onDirtyChange }) {
  let currentMode = savedMode;

  function updateSelector() {
    root.querySelectorAll('.theme-btn[data-theme-value]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeValue === currentMode);
    });
  }

  root.querySelectorAll('.theme-btn[data-theme-value]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.themeValue;
      // Only update the active button state; theme is applied on Save.
      updateSelector();
      onDirtyChange?.(currentMode !== savedMode);
    });
  });

  updateSelector();

  return {
    getMode: () => currentMode,
    discard: () => {
      currentMode = savedMode;
      updateSelector();
      onDirtyChange?.(false);
    },
  };
}

const fontPrefs = initFontPrefs(root, {
  existingPrefs,
  i18n,
  onDirtyChange: (dirty) => changesBar.markDirty('font', dirty),
});

const languagePrefs = initLanguagePrefs(root, languagePriority, {
  onDirtyChange: (dirty) => changesBar.markDirty('language', dirty),
});

const themePrefs = initThemePrefs({
  onDirtyChange: (dirty) => changesBar.markDirty('theme', dirty),
});

const changesBar = createUnsavedChangesBar(floatingToolbarEl, {
  onSave: async () => {
    const selectedFont = fontPrefs.getFont();
    const mode = themePrefs.getMode();
    const prefs = {
      appFont: toFontFamilyValue(selectedFont),
      appFontSize: fontPrefs.getFontSize(),
      languagePriority: languagePrefs.getPriority(),
      mode,
    };
    await savePrefs(prefs);
    // Persist theme to localStorage + cookie so getStoredTheme() reads it correctly on reload.
    persistTheme(mode);
    applyTheme(mode);
    setPreferredLanguages(prefs.languagePriority);
    localStorage.setItem('cognis_ui_preferences', JSON.stringify(prefs));
    alert(i18n.t('ui.app.settings.saved_alert'));
    window.location.reload();
  },
  onDiscard: () => {
    fontPrefs.discard();
    languagePrefs.discard();
    themePrefs.discard();
  },
});

await fontPrefs.init();
await languagePrefs.init();
