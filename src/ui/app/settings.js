import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { applyDocumentTitle, createI18n, setPreferredLanguage } from '../reuse/i18n.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
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

await renderDashboardLayout(root, {
  pageContext: `<h1>${i18n.t('ui.app.settings.page_title')}</h1><p>${i18n.t('ui.app.settings.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.app.settings.toolbar_title')}</h3><ul><li><button disabled>${i18n.t('ui.reuse.menu.profile')}</button></li><li><button disabled>${i18n.t('ui.reuse.appearance')}</button></li></ul>`,
  content: `<article class="docs-viewer">${section(i18n.t('ui.reuse.appearance'), `
      <label>${i18n.t('ui.app.settings.animation')} <select id="pref-animation"><option>none</option><option>fade</option><option>float</option></select></label><br/>
      <label>${i18n.t('ui.app.settings.greeting_font')} <input id="pref-font" placeholder="Inter, Arial, sans-serif"/></label><br/>
      <label>${i18n.t('ui.app.settings.greeting_size')} <input id="pref-font-size" type="number" min="0.8" max="2" step="0.05"/></label><br/>
      <label>${i18n.t('ui.app.settings.language')} <select id="pref-language"><option value="en">English</option></select></label><br/>
      <button id="save-prefs">${i18n.t('ui.app.settings.save')}</button>
    `)}</article>`
});

const existingPrefs = await loadPrefs().catch(() => null);
if (existingPrefs?.language) {
  const languageInput = root.querySelector('#pref-language');
  if (languageInput) languageInput.value = existingPrefs.language;
}

root.querySelector('#save-prefs')?.addEventListener('click', async () => {
  const prefs = {
    animation: root.querySelector('#pref-animation')?.value || 'none',
    greetingFont: root.querySelector('#pref-font')?.value || 'Inter, Arial, sans-serif',
    greetingFontSize: Number(root.querySelector('#pref-font-size')?.value || 1.4),
    language: root.querySelector('#pref-language')?.value || 'en'
  };
  await savePrefs(prefs);
  setPreferredLanguage(prefs.language);
  localStorage.setItem('cognis_ui_preferences', JSON.stringify(prefs));
  alert(i18n.t('ui.app.settings.saved_alert'));
  window.location.reload();
});
