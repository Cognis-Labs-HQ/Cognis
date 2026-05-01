import { DEFAULT_PAGES } from '../config/pages.js';
import { getWidgetDefinition, getWidgetLibrary, mergeWidgetConfig } from '../components/widget-registry.js';
import { runDemoPuppeteer } from './demo-puppeteer.js';
import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { loadTemplate } from '../reuse/template-loader.js';
import { apiFetch } from '../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../reuse/i18n.js';

const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.dashboard');

const state = {
  pages: structuredClone(DEFAULT_PAGES),
  activePageId: DEFAULT_PAGES[0].id,
  banner: i18n.t('ui.app.builder.banner.ready'),
  demoMode: false,
  demoRunning: { value: false }
};

const root = document.querySelector('#app');

function getActivePage() {
  return state.pages.find((page) => page.id === state.activePageId);
}

async function loadDemoMode() {
  try {
    const response = await apiFetch('/api/v1/system/ui-config');
    const payload = await response.json();
    state.demoMode = payload?.data?.demoMode === true;
  } catch {
    state.demoMode = false;
  }
}

async function savePreferences() {
  const account = localStorage.getItem('cognis_account');
  if (!account) return;

  const activePage = getActivePage();
  const path = `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(activePage.id)}`;
  await apiFetch(path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ layout: activePage.widgets })
  });
}

function createWidgetCard(widget, index) {
  const definition = getWidgetDefinition(widget.id);
  const config = mergeWidgetConfig(widget.id, widget.config);

  return `
    <article class="widget-card">
      <header>
        <h3>${definition?.title ?? widget.id}</h3>
        <button data-action="remove" data-index="${index}">${i18n.t('ui.app.builder.remove')}</button>
      </header>
      <p>${definition?.description ?? i18n.t('ui.app.builder.custom_widget')}</p>
      <label>
        ${i18n.t('ui.app.builder.json_config')}
        <textarea data-action="config" data-index="${index}">${JSON.stringify(config, null, 2)}</textarea>
      </label>
    </article>
  `;
}

async function render(banner) {
  const activePage = getActivePage();
  if (banner) state.banner = banner;

  const tabs = state.pages
    .map((page) => `<button class="tab ${page.id === activePage.id ? 'active' : ''}" data-page="${page.id}">${page.name}</button>`)
    .join('');

  const widgets = activePage.widgets.length
    ? activePage.widgets.map((widget, index) => createWidgetCard(widget, index)).join('')
    : `<p class="empty">${i18n.t('ui.app.builder.empty')}</p>`;

  const options = getWidgetLibrary().map((widget) => `<option value="${widget.id}">${widget.title}</option>`).join('');
  const pageTemplate = await loadTemplate('page-builder');
  const content = pageTemplate
    .replace('{{tabs}}', tabs)
    .replace('{{options}}', options)
    .replace('{{addWidget}}', i18n.t('ui.app.builder.add_widget'))
    .replace('{{runDemo}}', i18n.t('ui.app.builder.run_demo'))
    .replace('{{demoDisabled}}', state.demoMode ? '' : 'disabled')
    .replace('{{banner}}', state.banner)
    .replace('{{widgets}}', widgets);

  await renderDashboardLayout(root, {
    pageContext: `<h1>${i18n.t('ui.app.builder.page_title')}</h1><p>${i18n.t('ui.app.builder.page_subtitle')}</p>`,
    topbar: `<strong>${i18n.t('ui.app.builder.topbar')}</strong>`,
    toolbar: `<h3>${i18n.t('ui.app.builder.status')}</h3><p class="badge">${i18n.t('ui.app.builder.demo_mode')}: ${state.demoMode ? i18n.t('ui.app.builder.on') : i18n.t('ui.app.builder.off')}</p>`,
    content
  });

  bindEvents();
}

function bindEvents() {
  root.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activePageId = button.dataset.page;
      render();
    });
  });

  root.querySelector('#add-widget')?.addEventListener('click', async () => {
    const selected = root.querySelector('#widget-selector');
    const activePage = getActivePage();
    activePage.widgets.push({ id: selected.value, config: mergeWidgetConfig(selected.value) });
    await savePreferences();
    render(i18n.t('ui.app.builder.banner.added'));
  });

  root.querySelector('#run-demo')?.addEventListener('click', async () => {
    if (!state.demoMode || state.demoRunning.value) return;
    state.demoRunning.value = true;
    await runDemoPuppeteer({ state, render, isRunningRef: state.demoRunning, i18n });
  });

  root.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const activePage = getActivePage();
      activePage.widgets.splice(Number(button.dataset.index), 1);
      await savePreferences();
      render(i18n.t('ui.app.builder.banner.removed'));
    });
  });

  root.querySelectorAll('[data-action="config"]').forEach((textarea) => {
    textarea.addEventListener('change', async () => {
      const activePage = getActivePage();
      const index = Number(textarea.dataset.index);

      try {
        activePage.widgets[index].config = JSON.parse(textarea.value);
      } catch {
        textarea.classList.add('invalid');
        state.banner = i18n.t('ui.app.builder.banner.invalid_json');
        return;
      }

      textarea.classList.remove('invalid');
      await savePreferences();
      render(i18n.t('ui.app.builder.banner.updated'));
    });
  });
}

await loadDemoMode();
await render();
