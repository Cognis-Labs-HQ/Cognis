import { DEFAULT_PAGES } from '../config/pages.js';
import { getWidgetDefinition, getWidgetLibrary, mergeWidgetConfig } from '../components/widget-registry.js';

const state = {
  pages: structuredClone(DEFAULT_PAGES),
  activePageId: DEFAULT_PAGES[0].id
};

const root = document.querySelector('#app');

function getActivePage() {
  return state.pages.find((page) => page.id === state.activePageId);
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

function render() {
  const activePage = getActivePage();
  const pageTabs = state.pages
    .map((page) => `<button class="tab ${page.id === activePage.id ? 'active' : ''}" data-page="${page.id}">${page.name}</button>`)
    .join('');

  const widgetCards = activePage.widgets.length
    ? activePage.widgets.map((widget, index) => createWidgetCard(widget, index)).join('')
    : '<p class="empty">No widgets yet. Add one from the library.</p>';

  const widgetOptions = getWidgetLibrary()
    .map((widget) => `<option value="${widget.id}">${widget.title}</option>`)
    .join('');

  root.innerHTML = `
    <section class="shell">
      <aside class="sidebar">
        <img src="../public/assets/icons/cognis-icon.png" alt="Cognis" class="brand" />
        <h1>Page Builder</h1>
        <p>Compose each page with draggable-ready, configurable widgets.</p>
      </aside>
      <main class="workspace">
        <nav class="tabs">${pageTabs}</nav>
        <section class="controls">
          <select id="widget-selector">${widgetOptions}</select>
          <button id="add-widget">Add Widget</button>
        </section>
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
    render();
  });

  root.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', () => {
      const activePage = getActivePage();
      activePage.widgets.splice(Number(button.dataset.index), 1);
      render();
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
        return;
      }
      textarea.classList.remove('invalid');
      render();
    });
  });
}

render();
