import { DEFAULT_PAGES } from '../config/pages.js';
import { getWidgetDefinition, getWidgetLibrary, mergeWidgetConfig } from '../components/widget-registry.js';
import { runDemoPuppeteer } from './demo-puppeteer.js';
import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { loadTemplate } from '../reuse/template-loader.js';
import { apiFetch } from '../reuse/api-client.js';

const state = {
  pages: structuredClone(DEFAULT_PAGES),
  activePageId: DEFAULT_PAGES[0].id,
  banner: 'Ready.',
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
        <button data-action="remove" data-index="${index}">Remove</button>
      </header>
      <p>${definition?.description ?? 'Custom widget'}</p>
      <label>
        JSON Config
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
    : '<p class="empty">No widgets yet. Add one from the library.</p>';

  const options = getWidgetLibrary().map((widget) => `<option value="${widget.id}">${widget.title}</option>`).join('');
  const pageTemplate = await loadTemplate('page-builder');
  const content = pageTemplate
    .replace('{{tabs}}', tabs)
    .replace('{{options}}', options)
    .replace('{{demoDisabled}}', state.demoMode ? '' : 'disabled')
    .replace('{{banner}}', state.banner)
    .replace('{{widgets}}', widgets);

  await renderDashboardLayout(root, {
    sidebar: `<img src="/dashboard/static/assets/icons/cognis-icon.png" alt="Cognis" class="brand" /><h1>Page Builder</h1><p>Guardrailed rows/columns keep customizations sane.</p><p class="badge">Demo mode: ${state.demoMode ? 'ON' : 'OFF'}</p>`,
    topbar: '<strong>Dashboard Layout</strong>',
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
    render('Widget added.');
  });

  root.querySelector('#run-demo')?.addEventListener('click', async () => {
    if (!state.demoMode || state.demoRunning.value) return;
    state.demoRunning.value = true;
    await runDemoPuppeteer({ state, render, isRunningRef: state.demoRunning });
  });

  root.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const activePage = getActivePage();
      activePage.widgets.splice(Number(button.dataset.index), 1);
      await savePreferences();
      render('Widget removed.');
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
        state.banner = 'Invalid JSON. Fix and retry.';
        return;
      }

      textarea.classList.remove('invalid');
      await savePreferences();
      render('Widget configuration updated.');
    });
  });
}

await loadDemoMode();
await render();
