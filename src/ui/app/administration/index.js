import { renderDashboardLayout } from '../../layouts/dashboard-layout.js';
import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.administration');
let activeView = 'modules';

async function loadModules() {
  const response = await apiFetch('/api/v1/modules');
  const payload = await response.json();
  return payload.data ?? [];
}

async function loadIntegrity() {
  const response = await apiFetch('/api/v1/modules/integrity');
  const payload = await response.json();
  return payload.data ?? [];
}

async function toggleModule(moduleId, action) {
  await apiFetch(`/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`, { method: 'POST' });
}

function getStatePill(status) {
  if (status === 'enabled') return { label: i18n.t('ui.app.admin.state.active'), className: 'pill-active' };
  if (status === 'available') return { label: i18n.t('ui.app.admin.state.available'), className: 'pill-available' };
  return { label: i18n.t('ui.app.admin.state.disabled'), className: 'pill-disabled' };
}

function renderDetailsList(mod) {
  const details = [
    [i18n.t('ui.reuse.id'), mod.id],
    [i18n.t('ui.reuse.version'), mod.version],
    [i18n.t('ui.app.admin.publisher'), mod.publisher || i18n.t('ui.app.admin.unknown')],
    [i18n.t('ui.reuse.class'), mod.class],
    [i18n.t('ui.app.admin.capabilities'), (mod.capabilities || []).join(', ') || i18n.t('ui.app.admin.none')],
  ];

  return details
    .map(([key, value]) => `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`)
    .join('');
}

function renderModulesPanel(modules) {
  return modules
    .map((mod) => {
      const pill = getStatePill(mod.status);
      const disableBlocked = mod.class === 'core';

      return `
        <details class="module-row" data-module="${mod.id}">
          <summary>
            <span><strong>${mod.name}</strong></span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(mod)}</ul>
            <label class="switch">
              <input type="checkbox" data-module="${mod.id}" ${mod.status === 'enabled' ? 'checked' : ''} ${disableBlocked ? 'disabled' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </details>
      `;
    })
    .join('');
}

function renderIntegrityPanel(integrityRows) {
  if (!integrityRows.length) return `<p>${i18n.t('ui.app.admin.no_integrity')}</p>`;
  const items = integrityRows
    .map((row) => {
      const mismatchDetails =
        row.status !== 'ok'
          ? ` (${i18n.t('ui.app.admin.expected')} ${row.expected}, ${i18n.t('ui.app.admin.got')} ${row.actual ?? i18n.t('ui.app.admin.missing')})`
          : '';
      return `<li class="integrity-${row.status}"><strong>${row.moduleId}</strong> / ${row.file}: ${row.status}${mismatchDetails}</li>`;
    })
    .join('');
  return `<ul class="integrity-list">${items}</ul>`;
}

function renderToolbar() {
  return `
    <h2>${i18n.t('ui.reuse.navigation')}</h2>
    <ul>
      <li><button data-view="modules" class="${activeView === 'modules' ? 'active' : ''}" ${activeView === 'modules' ? 'aria-current="page"' : ''}>${i18n.t('ui.reuse.modules')}</button></li>
      <li><button data-view="integrity" class="${activeView === 'integrity' ? 'active' : ''}" ${activeView === 'integrity' ? 'aria-current="page"' : ''}>${i18n.t('ui.reuse.file_integrity')}</button></li>
    </ul>
  `;
}

async function renderPage() {
  const modules = activeView === 'modules' ? await loadModules() : [];
  const integrityRows = activeView === 'integrity' ? await loadIntegrity() : [];

  const content =
    activeView === 'modules'
      ? `<section class="widget-card"><h2>${i18n.t('ui.reuse.modules')}</h2>${renderModulesPanel(modules)}</section>`
      : `<section class="widget-card"><div class="integrity-header"><h2>${i18n.t('ui.reuse.file_integrity')}</h2><button id="rerun-integrity" type="button">${i18n.t('ui.app.admin.rerun')}</button></div>${renderIntegrityPanel(integrityRows)}</section>`;

  await renderDashboardLayout(root, {
    pageContext: `<h1>${i18n.t('ui.app.admin.page_title')}</h1><p>${i18n.t('ui.app.admin.page_subtitle')}</p>`,
    toolbar: renderToolbar(),
    content,
  });

  root.querySelectorAll('button[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      activeView = button.dataset.view;
      await renderPage();
    });
  });

  root.querySelectorAll('input[type="checkbox"][data-module]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const moduleId = toggle.dataset.module;
      const action = toggle.checked ? 'enable' : 'disable';

      if (action === 'disable') {
        const confirmed = window.confirm(`${i18n.t('ui.app.admin.disable_confirm')} "${moduleId}"?`);
        if (!confirmed) {
          window.location.reload();
          return;
        }
      }

      await toggleModule(moduleId, action);
      await renderPage();
    });
  });

  const rerunButton = root.querySelector('#rerun-integrity');
  if (rerunButton) {
    rerunButton.addEventListener('click', async () => {
      /** @type {HTMLButtonElement} */
      const btn = rerunButton;
      btn.disabled = true;
      btn.textContent = i18n.t('ui.app.admin.checking');
      await renderPage();
    });
  }
}

await renderPage();

