import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';

const root = document.querySelector('#app');

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
const rows = modules.map((mod) => `<tr><td>${mod.id}</td><td>${mod.version}</td><td>${mod.class}</td><td><button data-module="${mod.id}" data-action="enable">Enable</button> <button data-module="${mod.id}" data-action="disable">Disable</button></td></tr>`).join('');

await renderDashboardLayout(root, {
  pageContext: '<h1>Modules Overview</h1><p>Enable and disable installed modules.</p>',
  toolbar: '<h3>Modules</h3><p>Admin-only controls</p>',
  content: `<article class="docs-viewer"><table><thead><tr><th>ID</th><th>Version</th><th>Class</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></article>`
});

root.querySelectorAll('button[data-module]').forEach((button) => {
  button.addEventListener('click', async () => {
    await toggleModule(button.dataset.module, button.dataset.action);
  });
});
