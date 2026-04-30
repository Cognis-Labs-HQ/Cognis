import { loadTemplate } from '../reuse/template-loader.js';

function getDisplayName() {
  return localStorage.getItem('cognis_display_name') || localStorage.getItem('cognis_account') || 'User';
}


function applyActiveNavigation() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.topnav a').forEach((link) => {
    const isActive = link.getAttribute('href') === currentPath;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function bindTopbarActions() {
  const toggle = document.querySelector('#profile-toggle');
  const dropdown = document.querySelector('#profile-dropdown');
  const logout = document.querySelector('#profile-logout');
  const nameEl = document.querySelector('#profile-name');

  if (nameEl) nameEl.textContent = getDisplayName();

  const profileMenu = document.querySelector('.profile-menu');

  const openMenu = () => {
    dropdown?.classList.remove('hidden');
    profileMenu?.classList.add('open');
  };

  const closeMenu = () => {
    dropdown?.classList.add('hidden');
    profileMenu?.classList.remove('open');
  };

  toggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dropdown?.classList.contains('hidden')) openMenu();
    else closeMenu();
  });

  toggle?.addEventListener('mouseenter', openMenu);
  profileMenu?.addEventListener('mouseleave', closeMenu);

  document.addEventListener('click', (event) => {
    if (!profileMenu?.contains(event.target)) closeMenu();
  });

  document.addEventListener('focusin', (event) => {
    if (!profileMenu?.contains(event.target)) closeMenu();
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
  const hasToolbar = Boolean(slots.toolbar);
  root.innerHTML = template
    .replace('{{pageContext}}', slots.pageContext || '')
    .replace('{{topbar}}', slots.topbar)
    .replace('{{workspaceClass}}', hasToolbar ? 'main-window--with-toolbar' : 'main-window--content-only')
    .replace('{{content}}', slots.content)
    .replace('{{toolbar}}', hasToolbar ? `<aside class="toolbar">${slots.toolbar}</aside>` : '');
  bindTopbarActions();
  applyActiveNavigation();
}
