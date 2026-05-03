/**
 * Reusable popup / modal dialog.
 *
 * Renders a modal overlay and returns a Promise that resolves with the `id` of
 * the action the user clicked, or `null` when the popup is dismissed via the
 * backdrop, the × close button, or the Escape key.
 *
 * The action descriptor array mirrors the page-composer `elements` pattern:
 * each entry is a plain object with `id`, `label`, and an optional `variant`.
 *
 * This module lazily injects /static/styles/reuse/popup.css into the document
 * <head> on the first call to openPopup(), so callers do not need to include
 * that stylesheet explicitly in their page HTML.
 *
 * Public exports:
 *   openPopup(options) — opens a modal and returns a Promise<string|null>.
 *
 * Usage:
 *   import { openPopup } from '../../reuse/popup.js';
 *
 *   const result = await openPopup({
 *     title: 'Disable module',
 *     body: `Are you sure you want to disable "my-module"?`,
 *     variant: 'danger',
 *     actions: [
 *       { id: 'confirm', label: 'Disable', variant: 'confirm' },
 *       { id: 'cancel',  label: 'Cancel',  variant: 'cancel'  },
 *     ],
 *   });
 *   if (result === 'confirm') { ... }
 *
 * Options:
 *   title    — heading text (rendered as plain text, HTML-escaped).
 *   body     — body content: either an HTML string or a `() => string` render
 *              function. Rendered as innerHTML; callers must escape dynamic values.
 *   variant  — visual style hint: 'info' | 'warning' | 'danger' | 'confirm'.
 *              Defaults to 'info'.
 *   actions  — Array<{ id: string, label: string, variant?: 'confirm' | 'cancel' | 'neutral' }>.
 *              When omitted, a single green 'Done' (confirm) button is rendered.
 *              The × header close button always uses the cancel (danger) style.
 *   maxWidth — CSS max-width value (e.g. '40%', '600px') applied to the dialog
 *              window. Defaults to the CSS-defined value (480px).
 *
 * @param {{
 *   title: string,
 *   body: string | (() => string),
 *   variant?: 'info' | 'warning' | 'danger' | 'confirm',
 *   actions?: Array<{ id: string, label: string, variant?: string }>,
 *   maxWidth?: string,
 * }} options
 * @returns {Promise<string|null>}
 */

let stylesheetReady = null;

function ensureStylesheet() {
  if (stylesheetReady) return stylesheetReady;

  const existing = document.querySelector('link[href="/static/styles/reuse/popup.css"]');
  if (existing) {
    stylesheetReady = existing.sheet
      ? Promise.resolve()
      : new Promise((resolve) => {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', resolve, { once: true });
        });
    return stylesheetReady;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/static/styles/reuse/popup.css';
  stylesheetReady = new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  document.head.appendChild(link);
  return stylesheetReady;
}

export async function openPopup({ title, body, variant = 'info', actions, maxWidth } = {}) {
  await ensureStylesheet();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'popup-title');

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function dismiss(actionId) {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      let removed = false;
      function removeOverlay() {
        if (!removed) {
          removed = true;
          overlay.remove();
        }
      }
      overlay.addEventListener('transitionend', removeOverlay, { once: true });
      setTimeout(removeOverlay, 500); // fallback if no transition fires (lines above)
      overlay.classList.remove('popup-overlay--visible');
      resolve(actionId ?? null);
    }

    const resolvedBody = typeof body === 'function' ? body() : (body ?? '');

    const effectiveActions = Array.isArray(actions) && actions.length > 0
      ? actions
      : [{ id: 'close', label: 'Done', variant: 'confirm' }];

    const actionButtons = effectiveActions
      .map((action) => {
        const btnVariant = action.variant ?? 'neutral';
        const btnClass = btnVariant === 'confirm'
          ? 'btn-confirm btn-animated popup-action-btn'
          : btnVariant === 'cancel'
            ? 'btn-cancel btn-animated popup-action-btn'
            : 'popup-action-btn popup-action-btn--neutral btn-animated';
        return `<button class="${btnClass}" data-popup-action="${escapeHtml(action.id)}" type="button">${escapeHtml(action.label)}</button>`;
      })
      .join('');

    overlay.innerHTML = `
      <div class="popup-dialog popup-dialog--${escapeHtml(variant)}">
        <div class="popup-header">
          <h2 class="popup-title" id="popup-title">${escapeHtml(title ?? '')}</h2>
          <button class="popup-close-btn btn-cancel btn-animated" data-popup-action="close" type="button" aria-label="Close">&#x2715;</button>
        </div>
        <div class="popup-body">${resolvedBody}</div>
        ${actionButtons ? `<div class="popup-footer">${actionButtons}</div>` : ''}
      </div>
    `;

    if (maxWidth) {
      overlay.querySelector('.popup-dialog').style.maxWidth = maxWidth;
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss(null);
    });

    overlay.querySelectorAll('[data-popup-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const actionId = btn.dataset.popupAction;
        dismiss(actionId === 'close' ? null : actionId);
      });
    });

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        dismiss(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      overlay.classList.add('popup-overlay--visible');
    });

    const firstFocusable = overlay.querySelector('button');
    firstFocusable?.focus();
  });
}
