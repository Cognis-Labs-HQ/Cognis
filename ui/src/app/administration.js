import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';

const root = document.querySelector('#app');

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
  if (status === 'available') return { label: 'Error', className: 'pill-error' };
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

function renderModulesPanel(modules, integrityRows) {
  const integrityHtml = integrityRows.length
    ? `<h3>Module Integrity</h3><ul class="integrity-list">${integrityRows.map((row) => `<li class="integrity-${row.status}"><strong>${row.moduleId}</strong> / ${row.file}: ${row.status}${row.status !== 'ok' ? ` (expected ${row.expected}, got ${row.actual ?? 'missing'})` : ''}</li>`).join('')}</ul>`
    : '<h3>Module Integrity</h3><p>No tracked module files reported.</p>';
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
              <input type="checkbox" data-module="${mod.id}" data-action="${mod.status === 'enabled' ? 'disable' : 'enable'}" ${mod.status === 'enabled' ? 'checked' : ''} ${disableBlocked ? 'disabled' : ''} />
              <span class="slider"></span>
              <span>${disableBlocked ? 'Core module (always enabled)' : 'Enabled / Disabled'}</span>
            </label>
          </div>
        </details>
      `;
    })
    .join('') + integrityHtml;
}

const modules = await loadModules();
const integrityRows = await loadIntegrity();

await renderDashboardLayout(root, {
  pageContext: '<h1>Administration</h1><p>Admin-only tools and controls.</p>',
  toolbar: '<h3>Navigation</h3><ul><li><button class="active" aria-current="page">Modules</button></li></ul>',
  content: `<article class="docs-viewer"><h2>Modules</h2>${renderModulesPanel(modules, integrityRows)}</article>`
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
    window.location.reload();
  });
});
