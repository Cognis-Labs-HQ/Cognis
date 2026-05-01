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

function statusClass(status) {
  return status === 'enabled' ? 'badge-enabled' : 'badge-disabled';
}

function renderModulesPanel(modules) {
  return modules
    .map((mod) => `
      <details class="module-row" data-module="${mod.id}">
        <summary>
          <span><strong>${mod.name}</strong></span>
          <span class="badge ${statusClass(mod.status)}">${mod.status}</span>
          <span class="module-chevron">▾</span>
        </summary>
        <div class="module-meta">
          <p><strong>ID:</strong> ${mod.id}</p>
          <p><strong>Version:</strong> ${mod.version}</p>
          <p><strong>Publisher:</strong> ${mod.publisher || 'Unknown'}</p>
          <p><strong>Class:</strong> ${mod.class}</p>
          <p><strong>Capabilities:</strong> ${(mod.capabilities || []).join(', ') || 'None'}</p>
          <p><button data-module="${mod.id}" data-action="enable">Enable</button> <button data-module="${mod.id}" data-action="disable">Disable</button></p>
        </div>
      </details>
    `)
    .join('');
}

const modules = await loadModules();

await renderDashboardLayout(root, {
  pageContext: '<h1>Administration</h1><p>Admin-only tools and controls.</p>',
  toolbar: '<h3>Navigation</h3><ul><li><button class="active" aria-current="page">Modules</button></li></ul>',
  content: `<article class="docs-viewer"><h2>Modules</h2>${renderModulesPanel(modules)}</article>`
});

root.querySelectorAll('button[data-module]').forEach((button) => {
  button.addEventListener('click', async () => {
    await toggleModule(button.dataset.module, button.dataset.action);
    window.location.reload();
  });
});
