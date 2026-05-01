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
            <fieldset class="module-toggle-group">
              <label>
                <input type="radio" name="module-${mod.id}" data-module="${mod.id}" data-action="enable" ${mod.status === 'enabled' ? 'checked' : ''} />
                Enable
              </label>
              <label>
                <input type="radio" name="module-${mod.id}" data-module="${mod.id}" data-action="disable" ${mod.status !== 'enabled' ? 'checked' : ''} ${disableBlocked ? 'disabled' : ''} />
                Disable${disableBlocked ? ' (blocked for core in UI)' : ''}
              </label>
            </fieldset>
          </div>
        </details>
      `;
    })
    .join('');
}

const modules = await loadModules();

await renderDashboardLayout(root, {
  pageContext: '<h1>Administration</h1><p>Admin-only tools and controls.</p>',
  toolbar: '<h3>Navigation</h3><ul><li><button class="active" aria-current="page">Modules</button></li></ul>',
  content: `<article class="docs-viewer"><h2>Modules</h2>${renderModulesPanel(modules)}</article>`
});

root.querySelectorAll('input[type="radio"][data-module]').forEach((radio) => {
  radio.addEventListener('change', async () => {
    if (!radio.checked) return;

    const action = radio.dataset.action;
    const moduleId = radio.dataset.module;

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
