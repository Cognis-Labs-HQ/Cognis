import { escapeHtml } from '../../reuse/escape-html.js';
import { apiFetch } from '../../reuse/api-client.js';

/**
 * Notification preferences sub-module for the Settings page.
 *
 * Renders a matrix of notification providers vs categories so users can
 * opt in or out of each combination. Integrates with the unsaved-changes bar.
 *
 * Public exports:
 *   initNotificationPrefs(root, options) — initialises the notification preferences matrix.
 *
 * Usage:
 *   const notifPrefs = initNotificationPrefs(root, { i18n, username, onDirtyChange });
 *   await notifPrefs.init();
 *
 * @param {Element} root
 * @param {{ i18n: object, username: string, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => Promise<void>, discard: () => void, isDirty: () => boolean, getPendingPrefs: () => Array<{senderId: string, category: string, enabled: boolean}> }}
 */
export function initNotificationPrefs(root, { i18n, username, onDirtyChange }) {
  let providers = [];
  let categories = [];
  let savedPrefs = {};
  let pendingPrefs = {};

  async function loadProviders() {
    const res = await apiFetch('/api/v1/notifications/providers');
    if (!res.ok) return;
    const payload = await res.json();
    providers = payload.data ?? [];
  }

  async function loadCategories() {
    const res = await apiFetch('/api/v1/notifications/categories');
    if (!res.ok) return;
    const payload = await res.json();
    categories = payload.data ?? [];
  }

  async function loadPrefs() {
    const res = await apiFetch(`/api/v1/users/${encodeURIComponent(username)}/notification-prefs`);
    if (!res.ok) return;
    const payload = await res.json();
    const raw = payload.data ?? [];
    savedPrefs = {};
    for (const entry of raw) {
      savedPrefs[`${entry.senderId}:${entry.category}`] = true;
    }
    pendingPrefs = { ...savedPrefs };
  }

  function renderMatrix() {
    const container = root.querySelector('#notif-matrix-container');
    if (!container) return;

    if (!providers.length) {
      container.innerHTML = `<p>${i18n.t('ui.app.settings.notif_no_providers')}</p>`;
      return;
    }
    if (!categories.length) {
      container.innerHTML = `<p>${i18n.t('ui.app.settings.notif_no_categories')}</p>`;
      return;
    }

    const headerCells = providers.map((p) => `<th>${escapeHtml(p.name)}</th>`).join('');
    const rows = categories.map((cat) => {
      const cells = providers.map((p) => {
        const prefKey = `${p.senderId}:${cat.id}`;
        const checked = pendingPrefs[prefKey] === true ? ' checked' : '';
        return `<td><input type="checkbox" data-pref-key="${escapeHtml(prefKey)}"${checked} /></td>`;
      }).join('');
      return `<tr><td>${escapeHtml(cat.label)}</td>${cells}</tr>`;
    }).join('');

    container.innerHTML = `
      <h3>${i18n.t('ui.app.settings.notif_matrix_heading')}</h3>
      <table class="notif-matrix">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function bindMatrixToggles() {
    const container = root.querySelector('#notif-matrix-container');
    if (!container) return;
    container.querySelectorAll('input[data-pref-key]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const prefKey = checkbox.dataset.prefKey;
        if (prefKey) {
          pendingPrefs[prefKey] = checkbox.checked;
        }
        onDirtyChange?.(isDirty());
      });
    });
  }

  function isDirty() {
    const allKeys = new Set([...Object.keys(savedPrefs), ...Object.keys(pendingPrefs)]);
    for (const key of allKeys) {
      const saved = savedPrefs[key] === true;
      const pending = pendingPrefs[key] === true;
      if (saved !== pending) return true;
    }
    return false;
  }

  function discard() {
    pendingPrefs = { ...savedPrefs };
    renderMatrix();
    bindMatrixToggles();
    onDirtyChange?.(false);
  }

  function getPendingPrefs() {
    const result = [];
    const allKeys = new Set([...Object.keys(savedPrefs), ...Object.keys(pendingPrefs)]);
    for (const key of allKeys) {
      const [senderId, ...catParts] = key.split(':');
      const category = catParts.join(':');
      result.push({ senderId, category, enabled: pendingPrefs[key] === true });
    }
    return result;
  }

  return {
    async init() {
      await Promise.all([loadProviders(), loadCategories(), loadPrefs()]);
      renderMatrix();
      bindMatrixToggles();
    },
    discard,
    isDirty,
    getPendingPrefs,
  };
}
