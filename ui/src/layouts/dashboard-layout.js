import { loadTemplate } from '../reuse/template-loader.js';

export async function renderDashboardLayout(root, slots) {
  const template = await loadTemplate('dashboard-layout');
  root.innerHTML = template
    .replace('{{sidebar}}', slots.sidebar)
    .replace('{{topbar}}', slots.topbar)
    .replace('{{content}}', slots.content);
}
