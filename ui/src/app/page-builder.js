import { DEFAULT_PAGES } from '../config/pages.js';
import { getWidgetDefinition, getWidgetLibrary, mergeWidgetConfig } from '../components/widget-registry.js';
import { runDemoPuppeteer } from './demo-puppeteer.js';

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
  const queryDemo = new URLSearchParams(window.location.search).get('demo');
  if (queryDemo === '1') {
    state.demoMode = true;
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/v1/system/ui-config');
    const payload = await response.json();
    state.demoMode = payload?.data?.demoMode === true;
  } catch {
    state.demoMode = false;
  }
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

function render(banner) {
  const activePage = getActivePage();
  if (banner) state.banner = banner;

  const pageTabs = state.pages
    .map((page) => `<button class="tab ${page.id === activePage.id ? 'active' : ''}" data-page="${page.id}">${page.name}</button>`)
    .join('');

  const widgetCards = activePage.widgets.length
    ? activePage.widgets.map((widget, index) => createWidgetCard(widget, index)).join('')
    : '<p class="empty">No widgets yet. Add one from the library.</p>';

  const widgetOptions = getWidgetLibrary().map((widget) => `<option value="${widget.id}">${widget.title}</option>`).join('');

  root.innerHTML = `
    <section class="shell">
      <aside class="sidebar">
        <img src="./public/assets/icons/cognis-icon.png" alt="Cognis" class="brand" />
        <h1>Page Builder</h1>
        <p>Compose each page with configurable widgets.</p>
        <p class="badge">Demo mode: ${state.demoMode ? 'ON' : 'OFF'}</p>
      </aside>
      <main class="workspace">
        <nav class="tabs">${pageTabs}</nav>
        <section class="controls">
          <select id="widget-selector">${widgetOptions}</select>
          <button id="add-widget">Add Widget</button>
          <button id="run-demo" ${state.demoMode ? '' : 'disabled'}>Run Demo Flow</button>
        </section>
        <p class="banner">${state.banner}</p>
        <section class="widgets">${widgetCards}</section>
      </main>
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  root.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activePageId = button.dataset.page;
      render();
    });
  });

  root.querySelector('#add-widget')?.addEventListener('click', () => {
    const selected = root.querySelector('#widget-selector');
    const activePage = getActivePage();
    activePage.widgets.push({ id: selected.value, config: mergeWidgetConfig(selected.value) });
    render('Widget added.');
  });

  root.querySelector('#run-demo')?.addEventListener('click', async () => {
    if (!state.demoMode || state.demoRunning.value) return;
    state.demoRunning.value = true;
    await runDemoPuppeteer({ state, render, isRunningRef: state.demoRunning });
  });

  root.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', () => {
      const activePage = getActivePage();
      activePage.widgets.splice(Number(button.dataset.index), 1);
      render('Widget removed.');
    });
  });

  root.querySelectorAll('[data-action="config"]').forEach((textarea) => {
    textarea.addEventListener('change', () => {
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
      render('Widget configuration updated.');
    });
  });
}

await loadDemoMode();
render();
