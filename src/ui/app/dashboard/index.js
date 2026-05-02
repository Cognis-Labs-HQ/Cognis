import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { startTour, resumeTourIfPending } from '../../reuse/guided-tour.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.dashboard');

const account = localStorage.getItem('cognis_account') ?? '';
const displayName = localStorage.getItem('cognis_display_name') ?? account;
const role = localStorage.getItem('cognis_role') ?? 'user';

async function loadAccountInfo() {
  if (!account) return null;
  try {
    const response = await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/info`);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.data ?? null;
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return i18n.t('ui.app.dashboard.never');
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return i18n.t('ui.app.dashboard.never');
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

async function isTourCompleted() {
  if (!account) return true;
  try {
    const response = await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/system-tour-completed`);
    if (!response.ok) return true;
    const payload = await response.json();
    const raw = payload?.data?.layoutJson;
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.completed === true;
  } catch {
    return true;
  }
}

async function markTourCompleted() {
  if (!account) return;
  try {
    await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/system-tour-completed`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ layout: { completed: true } }),
    });
  } catch {}
}

function buildFirstLoginTour() {
  return {
    id: 'first-login',
    steps: [
      {
        path: '/dashboard',
        actions: [
          {
            type: 'popup',
            title: i18n.t('ui.tour.first_login.welcome.title'),
            body: i18n.t('ui.tour.first_login.welcome.body'),
            variant: 'info',
          },
        ],
      },
      {
        path: '/dashboard',
        actions: [
          {
            type: 'spotlight',
            target: '.dashboard-app-icon',
            message: i18n.t('ui.tour.first_login.app_icon.message'),
            position: 'right',
          },
        ],
      },
      {
        path: '/dashboard',
        actions: [
          {
            type: 'spotlight',
            target: '.dashboard-info-list',
            message: i18n.t('ui.tour.first_login.account.message'),
            position: 'below',
          },
        ],
      },
      {
        path: '/dashboard',
        actions: [
          {
            type: 'popup',
            title: i18n.t('ui.tour.first_login.finish.title'),
            body: i18n.t('ui.tour.first_login.finish.body'),
            variant: 'confirm',
          },
        ],
      },
    ],
  };
}

const info = await loadAccountInfo();

const elements = [
  {
    id: 'app-icon',
    label: i18n.t('ui.app.dashboard.element.app_icon.label'),
    pinned: true,
    gridSize: { default: [2, 2], min: [2, 2], max: [4, 4] },
    render: () => `
      <div class="dashboard-app-icon">
        <img src="/static/assets/icons/cognis-icon.png" alt="${i18n.t('ui.shared.brand.name')}" class="dashboard-app-icon-img" />
        <span class="dashboard-app-icon-name">${i18n.t('ui.shared.brand.name')}</span>
      </div>
    `,
  },
  {
    id: 'welcome',
    label: i18n.t('ui.app.dashboard.element.welcome.label'),
    gridSize: { default: [4, 2], min: [2, 2] },
    render: () => `
      <h2 class="dashboard-welcome-heading">${i18n.t('ui.layout.greeting')} ${displayName}</h2>
      <p class="dashboard-welcome-account">${account}</p>
    `,
  },
  {
    id: 'account-info',
    label: i18n.t('ui.app.dashboard.element.account.label'),
    gridSize: { default: [4, 3], min: [3, 2] },
    render: () => `
      <h3>${i18n.t('ui.app.dashboard.element.account.label')}</h3>
      <dl class="dashboard-info-list">
        <dt>${i18n.t('ui.app.dashboard.role')}</dt>
        <dd>${role}</dd>
        <dt>${i18n.t('ui.app.dashboard.member_since')}</dt>
        <dd>${formatDate(info?.createdAt ?? null)}</dd>
      </dl>
    `,
  },
  {
    id: 'last-login',
    label: i18n.t('ui.app.dashboard.element.last_login.label'),
    gridSize: { default: [3, 2], min: [2, 2] },
    render: () => `
      <h3>${i18n.t('ui.app.dashboard.element.last_login.label')}</h3>
      <p class="dashboard-last-seen">
        ${i18n.t('ui.app.dashboard.last_seen')}: <strong>${formatDateTime(info?.lastLogin ?? null)}</strong>
      </p>
    `,
  },
];

const composer = createPageComposer(root, {
  allowCustomization: true,
  elements,
  preferenceKey: 'dashboard-layout',
  i18n,
  pageContext: {
    title: i18n.t('ui.app.dashboard.page_title'),
    subtitle: i18n.t('ui.app.dashboard.page_subtitle'),
  },
});

await composer.init();

const firstLoginTour = buildFirstLoginTour();

await resumeTourIfPending({ 'first-login': firstLoginTour }, {
  i18n,
  onComplete: markTourCompleted,
});

const tourAlreadyDone = await isTourCompleted();
if (!tourAlreadyDone) {
  await startTour(firstLoginTour, {
    i18n,
    onComplete: markTourCompleted,
  });
}
