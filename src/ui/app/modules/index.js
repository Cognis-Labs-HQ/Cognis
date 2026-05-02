import { renderDashboardLayout } from '../../layouts/dashboard-layout.js';
import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.modules');

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

function renderModulesTable(rows) {
  const rowsHtml = rows
    .map(
      (mod) =>
        `<tr>
          <td>${mod.id}</td>
          <td>${mod.version}</td>
          <td>${mod.class}</td>
          <td>
            <button data-module="${mod.id}" data-action="enable">${i18n.t('ui.reuse.generic.enable')}</button>
            <button data-module="${mod.id}" data-action="disable">${i18n.t('ui.reuse.generic.disable')}</button>
          </td>
        </tr>`
    )
    .join('');
  return `
    <table>
      <thead>
        <tr>
          <th>${i18n.t('ui.reuse.generic.id')}</th>
          <th>${i18n.t('ui.reuse.generic.version')}</th>
          <th>${i18n.t('ui.reuse.generic.class')}</th>
          <th>${i18n.t('ui.reuse.generic.actions')}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

const elements = [
  {
    id: 'modules-list',
    label: i18n.t('ui.reuse.modules'),
    render: () => `<h2>${i18n.t('ui.app.modules.page_title')}</h2>${renderModulesTable(modules)}`,
  },
];

await renderDashboardLayout(root, {
  pageContext: `<h1>${i18n.t('ui.app.modules.page_title')}</h1><p>${i18n.t('ui.app.modules.page_subtitle')}</p>`,
  toolbar: `<h3>${i18n.t('ui.reuse.modules')}</h3><p>${i18n.t('ui.app.modules.toolbar_subtitle')}</p>`,
  content: '',
});

const composer = createPageComposer(root.querySelector('.content-grid'), {
  allowCustomization: false,
  elements,
  preferenceKey: 'modules-layout',
  i18n,
  onRender: () => {
    root.querySelectorAll('button[data-module]').forEach((button) => {
      button.addEventListener('click', async () => {
        await toggleModule(button.dataset.module, button.dataset.action);
      });
    });
  },
});
await composer.init();

