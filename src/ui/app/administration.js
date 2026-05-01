import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';

const root = document.querySelector('#app');
let activeView = 'modules';

async function loadModules() {
  const response = await apiFetch('/api/v1/modules');
  const payload = await response.json();
  return payload.data ?? [];
}

async function toggleModule(moduleId, action) {
  await apiFetch(`/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`, { method: 'POST' });
}
async function loadIntegrity() {
  const response = await apiFetch('/api/v1/modules/integrity');
  const payload = await response.json();
  return payload.data ?? [];
}

function getStatePill(status) {
  if (status === 'enabled') return { label: 'Active', className: 'pill-active' };
  if (status === 'available') return { label: 'Available', className: 'pill-available' };
  return { label: 'Disabled', className: 'pill-disabled' };
}

function renderDetailsList(mod) {
  const details = [
    ['ID', mod.id],
    ['Version', mod.version],
    ['Publisher', mod.publisher || 'Unknown'],
    ['Class', mod.class],
    ['Capabilities', (mod.capabilities || []).join(', ') || 'None']
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
  if (!integrityRows.length) return '<p>No tracked module files reported.</p>';
  const items = integrityRows
    .map((row) => {
      const mismatchDetails =
        row.status !== 'ok'
          ? ` (expected ${row.expected}, got ${row.actual ?? 'missing'})`
          : '';
      return `<li class="integrity-${row.status}"><strong>${row.moduleId}</strong> / ${row.file}: ${row.status}${mismatchDetails}</li>`;
    })
    .join('');
  return `<ul class="integrity-list">${items}</ul>`;
}

function renderToolbar() {
  return `
    <h3>Navigation</h3>
    <ul>
      <li><button data-view="modules" class="${activeView === 'modules' ? 'active' : ''}" ${activeView === 'modules' ? 'aria-current="page"' : ''}>Modules</button></li>
      <li><button data-view="integrity" class="${activeView === 'integrity' ? 'active' : ''}" ${activeView === 'integrity' ? 'aria-current="page"' : ''}>File Integrity</button></li>
    </ul>
  `;
}

async function renderPage() {
  const modules = await loadModules();
  const integrityRows = activeView === 'integrity' ? await loadIntegrity() : [];

  const content =
    activeView === 'modules'
      ? `<article class="docs-viewer"><h2>Modules</h2>${renderModulesPanel(modules)}</article>`
      : `<article class="docs-viewer"><div class="integrity-header"><h2>File Integrity</h2><button id="rerun-integrity">Re-run integrity check</button></div>${renderIntegrityPanel(integrityRows)}</article>`;

  await renderDashboardLayout(root, {
    pageContext: '<h1>Administration</h1><p>Admin-only tools and controls.</p>',
    toolbar: renderToolbar(),
    content
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
        const confirmed = window.confirm(`Disable module "${moduleId}"?`);
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
      const button = /** @type {HTMLButtonElement} */ (rerunButton);
      button.disabled = true;
      button.textContent = 'Checking...';
      await renderPage();
    });
  }
}

await renderPage();
