import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { createI18n } from '../reuse/i18n.js';

const root = document.querySelector('#app');
const i18n = await createI18n();

async function loadModules() {
  const response = await apiFetch('/api/v1/modules');
  const payload = await response.json();
  return payload.data || [];
}

async function toggleModule(moduleId, action) {
  await apiFetch(`/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`, { method: 'POST' });
  window.location.reload();
}

const modules = await loadModules();
const rows = modules.map((mod) => `<tr><td>${mod.id}</td><td>${mod.version}</td><td>${mod.class}</td><td><button data-module="${mod.id}" data-action="enable">${i18n.t('ui.reuse.enable')}</button> <button data-module="${mod.id}" data-action="disable">${i18n.t('ui.reuse.disable')}</button></td></tr>`).join('');

await renderDashboardLayout(root, {
  pageContext: `<h1>${i18n.t('ui.app.modules.page_title')}</h1><p>${i18n.t('ui.app.modules.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.reuse.modules')}</h3><p>${i18n.t('ui.app.modules.toolbar_subtitle')}</p>`,
  content: `<article class="docs-viewer"><table><thead><tr><th>ID</th><th>Version</th><th>Class</th><th>${i18n.t('ui.reuse.actions')}</th></tr></thead><tbody>${rows}</tbody></table></article>`
});

root.querySelectorAll('button[data-module]').forEach((button) => {
  button.addEventListener('click', async () => {
    await toggleModule(button.dataset.module, button.dataset.action);
  });
});
