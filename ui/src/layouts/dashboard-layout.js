import { loadTemplate } from '../reuse/template-loader.js';

function getDisplayName() {
  return localStorage.getItem('cognis_display_name') || localStorage.getItem('cognis_account') || 'User';
}

function bindTopbarActions() {
  const toggle = document.querySelector('#profile-toggle');
  const dropdown = document.querySelector('#profile-dropdown');
  const logout = document.querySelector('#profile-logout');
  const nameEl = document.querySelector('#profile-name');

  if (nameEl) nameEl.textContent = getDisplayName();

  toggle?.addEventListener('click', () => {
    dropdown?.classList.toggle('hidden');
  });

  logout?.addEventListener('click', () => {
    localStorage.removeItem('cognis_token');
    localStorage.removeItem('cognis_account');
    localStorage.removeItem('cognis_display_name');
    document.cookie = 'cognis_token=; Path=/; Max-Age=0';
    window.location.href = '/login';
  });
}

export async function renderDashboardLayout(root, slots) {
  const template = await loadTemplate('dashboard-layout');
  root.innerHTML = template
    .replace('{{pageContext}}', slots.pageContext || '')
    .replace('{{topbar}}', slots.topbar)
    .replace('{{content}}', slots.content)
    .replace('{{toolbar}}', slots.toolbar ? `<aside class="toolbar">${slots.toolbar}</aside>` : '');
  bindTopbarActions();
}
