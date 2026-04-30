import { loadTemplate } from '../reuse/template-loader.js';

function bindTopbarActions() {
  const toggle = document.querySelector('#profile-toggle');
  const dropdown = document.querySelector('#profile-dropdown');
  const logout = document.querySelector('#profile-logout');

  toggle?.addEventListener('click', () => {
    dropdown?.classList.toggle('hidden');
  });

  logout?.addEventListener('click', () => {
    localStorage.removeItem('cognis_token');
    localStorage.removeItem('cognis_account');
    window.location.href = '/login';
  });
}

export async function renderDashboardLayout(root, slots) {
  const template = await loadTemplate('dashboard-layout');
  root.innerHTML = template
    .replace('{{sidebar}}', slots.sidebar)
    .replace('{{topbar}}', slots.topbar)
    .replace('{{content}}', slots.content);
  bindTopbarActions();
}
