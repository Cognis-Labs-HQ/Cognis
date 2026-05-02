import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.administration');

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
    [i18n.t('ui.reuse.generic.id'), mod.id],
    [i18n.t('ui.reuse.generic.version'), mod.version],
    [i18n.t('ui.app.admin.publisher'), mod.publisher || i18n.t('ui.app.admin.unknown')],
    [i18n.t('ui.reuse.generic.class'), mod.class],
    [i18n.t('ui.app.admin.capabilities'), (mod.capabilities || []).join(', ') || i18n.t('ui.app.admin.none')],
  ];

  return details
    .map(([key, value]) => `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`)
    .join('');
}

function renderModulesContent(modules) {
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

function renderIntegrityContent(integrityRows) {
  if (!integrityRows.length) return `<p>${i18n.t('ui.app.admin.no_integrity')}</p>`;

  const byModule = new Map();
  for (const row of integrityRows) {
    if (!byModule.has(row.moduleId)) byModule.set(row.moduleId, []);
    byModule.get(row.moduleId).push(row);
  }

  const sections = [];
  for (const [moduleId, rows] of byModule) {
    const items = rows
      .map((row) => {
        const mismatchDetails =
          row.status !== 'ok'
            ? ` (${i18n.t('ui.app.admin.expected')} ${row.expected}, ${i18n.t('ui.app.admin.got')} ${row.actual ?? i18n.t('ui.app.admin.missing')})`
            : '';
        return `<li class="integrity-${row.status}">${row.file}: ${row.status}${mismatchDetails}</li>`;
      })
      .join('');
    sections.push(`
      <div class="integrity-module">
        <h3>${moduleId}</h3>
        <ul class="integrity-list">${items}</ul>
      </div>
    `);
  }
  return sections.join('');
}

function bindModuleToggles() {
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
      modules = await loadModules();
      composer.refresh(elements);
    });
  });
}

function bindIntegrityRerun() {
  const rerunButton = root.querySelector('#rerun-integrity');
  if (!rerunButton) return;
  rerunButton.addEventListener('click', async () => {
    /** @type {HTMLButtonElement} */
    const btn = rerunButton;
    btn.disabled = true;
    btn.textContent = i18n.t('ui.app.admin.checking');
    integrityRows = await loadIntegrity();
    composer.refresh(elements);
  });
}

let [modules, integrityRows] = await Promise.all([loadModules(), loadIntegrity()]);
let composer;

const elements = [
  {
    id: 'modules',
    label: i18n.t('ui.reuse.modules'),
    render: () => `<h2>${i18n.t('ui.reuse.modules')}</h2>${renderModulesContent(modules)}`,
    gridSize: { default: [8, 6], min: [4, 3], max: 'full' },
  },
  {
    id: 'integrity',
    label: i18n.t('ui.reuse.file_integrity'),
    render: () => `
      <div class="integrity-header">
        <h2>${i18n.t('ui.reuse.file_integrity')}</h2>
        <button id="rerun-integrity" class="btn-confirm btn-animated" type="button">${i18n.t('ui.reuse.generic.refresh')}</button>
      </div>
      ${renderIntegrityContent(integrityRows)}
    `,
    gridSize: { default: [8, 4], min: [4, 3], max: 'full' },
  },
];

composer = createPageComposer(root, {
  allowCustomization: false,
  elements,
  preferenceKey: 'administration-layout',
  i18n,
  pageContext: {
    title: i18n.t('ui.app.admin.page_title'),
    subtitle: i18n.t('ui.app.admin.page_subtitle'),
  },
  onRender: () => {
    bindModuleToggles();
    bindIntegrityRerun();
  },
});
await composer.init();

