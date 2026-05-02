/**
 * Page composer — orchestrates the full dashboard layout for a page, managing
 * widget-card sections within the main content grid with optional user-controlled
 * drag-to-reorder and show/hide customisation. Also creates the aside toolbar and
 * floating menu on behalf of the page so that page JS only needs to declare elements.
 *
 * Layouts are persisted to the user-preferences API under the caller-supplied key
 * so each page retains its own arrangement independently.
 *
 * Public exports:
 *   createPageComposer(root, options) — creates a layout composer and returns
 *     an instance with init() and refresh() methods.
 *
 * Usage:
 *   const composer = createPageComposer(document.querySelector('#app'), {
 *     allowCustomization: true,
 *     elements: [
 *       { id: 'modules', label: 'Modules', render: () => '<h2>Modules</h2>...' },
 *     ],
 *     preferenceKey: 'administration-layout',
 *     i18n,
 *     pageContext: { title: 'Administration', subtitle: 'Admin tools and controls.' },
 *     onRender: () => bindMyPageEvents(),
 *   });
 *   await composer.init();
 *   // Later, re-render with fresh data:
 *   composer.refresh(updatedElements);
 *
 * @param {HTMLElement} root - The #app root element for the page.
 * @param {{
 *   allowCustomization: boolean,
 *   elements: Array<{id: string, label: string, render: () => string}>,
 *   preferenceKey: string,
 *   i18n: object,
 *   onRender?: () => void,
 *   pageContext?: { title: string, subtitle: string },
 *   toolbar?: { render: () => string },
 *   floatingMenu?: { render: () => string },
 * }} options
 * @returns {{ init(): Promise<void>, refresh(elements: Array<{id: string, label: string, render: () => string}>): void }}
 */

import { apiFetch } from './api-client.js';
import { renderDashboardLayout } from '../layouts/dashboard-layout.js';

export function createPageComposer(root, {
  allowCustomization,
  elements: initialElements,
  preferenceKey,
  i18n,
  onRender,
  pageContext,
  toolbar,
  floatingMenu,
}) {
  let elements = initialElements;
  let layout = null;
  let editing = false;
  let dragSourceId = null;
  let contentGrid = null;

  async function loadLayout() {
    const account = localStorage.getItem('cognis_account');
    if (!account) return null;
    try {
      const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(preferenceKey)}`
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const raw = payload?.data?.layoutJson;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function saveLayout() {
    const account = localStorage.getItem('cognis_account');
    if (!account) return;
    await apiFetch(
      `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(preferenceKey)}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ layout }),
      }
    );
  }

  function getEffectiveLayout() {
    const allIds = elements.map((e) => e.id);
    const storedOrder = (layout?.order ?? []).filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !storedOrder.includes(id));
    const order = [...storedOrder, ...missing];
    const hidden = (layout?.hidden ?? []).filter((id) => allIds.includes(id));
    return { order, hidden };
  }

  function renderCards(effectiveLayout) {
    const { order, hidden } = effectiveLayout;
    return order
      .filter((id) => !hidden.includes(id))
      .map((id) => {
        const el = elements.find((e) => e.id === id);
        if (!el) return '';
        const dragAttrs = editing ? ` draggable="true"` : '';
        const dragHandle = editing
          ? `<div class="composer-drag-handle" aria-hidden="true">
               <span class="composer-drag-icon">⠿</span>
               <span class="composer-drag-label">${el.label}</span>
               <button class="composer-remove-btn" data-composer-remove="${el.id}" type="button">${i18n.t('ui.reuse.generic.remove')}</button>
             </div>`
          : '';
        const editingClass = editing ? ' composer-editing' : '';
        return `<div class="content-section"><section class="widget-card${editingClass}" data-composer-element="${el.id}"${dragAttrs}>${dragHandle}${el.render()}</section></div>`;
      })
      .join('');
  }

  function renderLibraryPanel(effectiveLayout) {
    const hiddenElements = elements.filter((e) => effectiveLayout.hidden.includes(e.id));
    const listItems = hiddenElements
      .map(
        (el) => `<li class="composer-library-item">
           <span>${el.label}</span>
           <button class="composer-add-btn" data-composer-add="${el.id}" type="button">${i18n.t('ui.reuse.generic.add')}</button>
         </li>`
      )
      .join('');
    const emptyMsg = !hiddenElements.length
      ? `<li class="composer-library-empty">${i18n.t('ui.reuse.page_composer.all_visible')}</li>`
      : '';
    return `
      <aside class="composer-library">
        <div class="composer-library-header">
          <h3>${i18n.t('ui.reuse.page_composer.sections')}</h3>
        </div>
        <ul class="composer-library-list">${listItems}${emptyMsg}</ul>
      </aside>
    `;
  }

  function render() {
    if (!contentGrid) return;
    const effectiveLayout = getEffectiveLayout();
    let html = '';

    if (allowCustomization) {
      const btnLabel = editing
        ? i18n.t('ui.reuse.generic.done')
        : i18n.t('ui.reuse.page_composer.edit_layout');
      const btnClass = editing ? 'composer-done-btn' : 'composer-edit-btn';
      html += `<div class="composer-header">
        <button class="${btnClass}" type="button">${btnLabel}</button>
      </div>`;
    }

    html += renderCards(effectiveLayout);

    if (editing) {
      html += renderLibraryPanel(effectiveLayout);
    }

    contentGrid.innerHTML = html;
    bindComposerEvents();
    onRender?.();
  }

  function bindComposerEvents() {
    contentGrid.querySelector('.composer-edit-btn')?.addEventListener('click', () => {
      editing = true;
      render();
    });

    contentGrid.querySelector('.composer-done-btn')?.addEventListener('click', async () => {
      editing = false;
      await saveLayout();
      render();
    });

    contentGrid.querySelectorAll('[data-composer-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.composerRemove;
        const effective = getEffectiveLayout();
        layout = { order: effective.order, hidden: [...effective.hidden, id] };
        await saveLayout();
        render();
      });
    });

    contentGrid.querySelectorAll('[data-composer-add]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.composerAdd;
        const effective = getEffectiveLayout();
        layout = { order: effective.order, hidden: effective.hidden.filter((h) => h !== id) };
        await saveLayout();
        render();
      });
    });

    contentGrid.querySelectorAll('[data-composer-element][draggable]').forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        dragSourceId = card.dataset.composerElement;
        card.classList.add('composer-dragging');
        event.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('composer-dragging');
        contentGrid.querySelectorAll('.composer-drag-over').forEach((el) => {
          el.classList.remove('composer-drag-over');
        });
        dragSourceId = null;
      });

      card.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (card.dataset.composerElement !== dragSourceId) {
          contentGrid.querySelectorAll('.composer-drag-over').forEach((el) => {
            el.classList.remove('composer-drag-over');
          });
          card.classList.add('composer-drag-over');
        }
      });

      card.addEventListener('drop', async (event) => {
        event.preventDefault();
        card.classList.remove('composer-drag-over');
        const targetId = card.dataset.composerElement;
        if (!dragSourceId || dragSourceId === targetId) return;

        const effective = getEffectiveLayout();
        const visibleOrder = effective.order.filter((id) => !effective.hidden.includes(id));
        const sourceIdx = visibleOrder.indexOf(dragSourceId);
        const targetIdx = visibleOrder.indexOf(targetId);
        if (sourceIdx === -1 || targetIdx === -1) return;

        visibleOrder.splice(sourceIdx, 1);
        visibleOrder.splice(targetIdx, 0, dragSourceId);

        const newOrder = [
          ...visibleOrder,
          ...effective.order.filter((id) => effective.hidden.includes(id)),
        ];
        layout = { order: newOrder, hidden: effective.hidden };
        await saveLayout();
        render();
      });
    });
  }

  async function init() {
    const pageContextHtml = pageContext
      ? `<h1>${pageContext.title}</h1><p>${pageContext.subtitle}</p>`
      : '';

    await renderDashboardLayout(root, {
      i18n,
      pageContext: pageContextHtml,
      toolbar: toolbar ? toolbar.render() : undefined,
      floatingToolbar: floatingMenu ? floatingMenu.render() : undefined,
      content: '',
    });

    contentGrid = root.querySelector('.content-grid');
    layout = await loadLayout();
    render();
  }

  function refresh(newElements) {
    editing = false;
    elements = newElements;
    render();
  }

  return { init, refresh };
}

