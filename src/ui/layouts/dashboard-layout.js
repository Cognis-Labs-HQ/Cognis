import { apiFetch } from '../reuse/api-client.js';
import { getInitialsText, pickInitialsColor } from '../reuse/avatar-utils.js';
import { loadTemplate } from '../reuse/template-loader.js';
import { bindThemeToggle as bindSharedThemeToggle, getStoredTheme } from '../reuse/theme-toggle.js';
import { applyStaticTranslations, createI18n } from '../reuse/i18n.js';
import { loadUiPreferences, applyUiPreferences } from '../reuse/ui-preferences.js';

function isAdminRole() {
  return localStorage.getItem('cognis_role') === 'admin';
}

function getDisplayName() {
  return localStorage.getItem('cognis_display_name') || localStorage.getItem('cognis_account') || '';
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


async function bindThemeToggle() {
  const prefs = await loadUiPreferences();
  applyUiPreferences(prefs);
  const storedMode = getStoredTheme();
  const initialMode = storedMode || prefs?.mode || 'dark';
  if (prefs?.mode !== initialMode) {
    await saveUiPreferences({ mode: initialMode });
  }
  bindSharedThemeToggle({
    readInitialTheme: () => initialMode,
    onThemeChange: async (mode) => {
      await saveUiPreferences({ mode });
    }
  });
}

const PROFILE_MENU_CLOSE_DELAY_MS = 300;

function bindTopbarActions() {
  const toggle = document.querySelector('#profile-toggle');
  const dropdown = document.querySelector('#profile-dropdown');
  const logout = document.querySelector('#profile-logout');
  const nameEl = document.querySelector('#profile-name');

  if (nameEl) nameEl.textContent = getDisplayName();

  const profileMenu = document.querySelector('.profile-menu');
  const adminOnlyItems = document.querySelectorAll('.admin-only');

  adminOnlyItems.forEach((item) => {
    item.hidden = !isAdminRole();
  });

  let closeTimeout = null;

  const openMenu = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
    dropdown?.classList.remove('hidden');
    profileMenu?.classList.add('open');
  };

  const closeMenu = () => {
    closeTimeout = setTimeout(() => {
      dropdown?.classList.add('hidden');
      profileMenu?.classList.remove('open');
      closeTimeout = null;
    }, PROFILE_MENU_CLOSE_DELAY_MS);
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
    localStorage.removeItem('cognis_role');
    document.cookie = 'cognis_token=; Path=/; Max-Age=0';
    window.location.href = '/login';
  });
}

export async function updateNavbarAvatar() {
  const avatarBtn = document.querySelector('.avatar-button');
  if (!avatarBtn) return;
  const handle = localStorage.getItem('cognis_account') ?? '';

  const prevImg = avatarBtn.querySelector('img.avatar-image');
  const prevBlobSrc = prevImg?.src?.startsWith('blob:') ? prevImg.src : null;

  try {
    const res = await apiFetch('/api/v1/profile');
    if (res.ok) {
      const payload = await res.json();
      const avatarKey = payload?.data?.avatarKey;
      if (avatarKey) {
        const fileRes = await apiFetch(`/api/v1/files/${avatarKey}`);
        if (fileRes.ok) {
          const img = document.createElement('img');
          img.className = 'avatar-image';
          img.alt = '';
          img.src = URL.createObjectURL(await fileRes.blob());
          avatarBtn.replaceChildren(img);
          if (prevBlobSrc) URL.revokeObjectURL(prevBlobSrc);
          return;
        }
      }
    }
  } catch {
    // fall through to initials (rendered in the block below)
  }
  if (prevBlobSrc) URL.revokeObjectURL(prevBlobSrc);
  const initialsEl = document.createElement('span');
  initialsEl.className = 'avatar-initials';
  initialsEl.textContent = getInitialsText(handle);
  initialsEl.style.background = pickInitialsColor(handle);
  avatarBtn.replaceChildren(initialsEl);
}

export async function renderDashboardLayout(root, slots = {}) {
  const i18n = slots.i18n || await createI18n();
  const template = await loadTemplate('dashboard-layout');
  const hasToolbar = Boolean(slots.toolbar);
  const hasFloatingToolbar = Boolean(slots.floatingToolbar);
  root.innerHTML = template
    .replace('{{pageContext}}', slots.pageContext || '')
    .replace('{{topbar}}', slots.topbar)
    .replace('{{workspaceClass}}', hasToolbar ? 'main-window--with-toolbar' : 'main-window--content-only')
    .replace('{{content}}', slots.content)
    .replace('{{toolbar}}', hasToolbar ? `<aside class="toolbar">${slots.toolbar}</aside>` : '')
    .replace('{{floatingToolbar}}', hasFloatingToolbar ? `<div class="floating-toolbar" hidden>${slots.floatingToolbar}</div>` : '');
  applyStaticTranslations(i18n, root);
  bindTopbarActions();
  updateNavbarAvatar().catch(() => {});
  applyActiveNavigation();
  bindThemeToggle();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const observer = new MutationObserver(() => {
      document.body.classList.toggle('composer-theme-hidden', themeToggle.hidden);
    });
    observer.observe(themeToggle, { attributes: true, attributeFilter: ['hidden'] });
    document.body.classList.toggle('composer-theme-hidden', themeToggle.hidden);
  }
}
