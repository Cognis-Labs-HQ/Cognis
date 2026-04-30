import { apiFetch } from '../reuse/api-client.js';
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


async function saveUiPreferences(patch) {
  const account = localStorage.getItem('cognis_account');
  if (!account) return;
  const current = await loadUiPreferences();
  const merged = { ...(current || {}), ...patch };
  await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ layout: merged })
  });
}

async function loadUiPreferences() {
  const account = localStorage.getItem('cognis_account');
  if (!account) return null;
  try {
    const response = await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`);
    const payload = await response.json();
    const raw = payload?.data?.layoutJson;
    if (!raw) return null;
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
}

function applyUiPreferences(prefs) {
  if (!prefs) return;
  if (prefs.greetingFont) document.body.style.setProperty('--user-greeting-font', prefs.greetingFont);
  if (prefs.greetingFontSize) document.body.style.setProperty('--user-greeting-size', `${prefs.greetingFontSize}rem`);
  document.body.setAttribute('data-animation', prefs.animation || 'none');
}


function applyTheme(mode) {
  const normalized = mode === 'light' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', normalized);
  document.body.classList.toggle('binary-theme--dark', normalized === 'dark');
  document.body.classList.toggle('binary-theme--light', normalized === 'light');

  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.setAttribute('data-theme', normalized);
    shell.classList.toggle('binary-theme--dark', normalized === 'dark');
    shell.classList.toggle('binary-theme--light', normalized === 'light');
  }

  const toggle = document.querySelector('#theme-toggle');
  if (toggle) {
    toggle.dataset.mode = normalized;
    toggle.textContent = normalized === 'dark' ? '💡 Off' : '💡 On';
  }
}

async function bindThemeToggle() {
  const toggle = document.querySelector('#theme-toggle');
  const prefs = await loadUiPreferences();
  applyUiPreferences(prefs);
  const local = localStorage.getItem('cognis_theme');
  const mode = prefs?.mode || local || 'dark';

  applyTheme(mode);

  toggle?.addEventListener('click', async () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('cognis_theme', next);
    await saveUiPreferences({ mode: next });
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
  bindThemeToggle();
}
