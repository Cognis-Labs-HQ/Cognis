import { escapeHtml } from '../../reuse/escape-html.js';
import { apiFetch } from '../../reuse/api-client.js';

/**
 * General preferences sub-module for the Settings page.
 *
 * Manages the user's email addresses: listing, adding, removing,
 * and setting a primary address.
 *
 * Public exports:
 *   initGeneralPrefs(root, options) — initialises email management in the given root element.
 *
 * Usage:
 *   const generalPrefs = initGeneralPrefs(root, { i18n, username });
 *   await generalPrefs.init();
 *
 * @param {Element} root
 * @param {{ i18n: object, username: string }} options
 * @returns {{ init: () => Promise<void> }}
 */
export function initGeneralPrefs(root, { i18n, username }) {
  let emails = [];

  async function loadEmails() {
    const res = await apiFetch(`/api/v1/users/${encodeURIComponent(username)}/emails`);
    if (!res.ok) return;
    const payload = await res.json();
    emails = payload.data ?? [];
  }

  async function addEmail(address) {
    const res = await apiFetch(`/api/v1/users/${encodeURIComponent(username)}/emails`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: address }),
    });
    if (!res.ok) throw new Error('add_failed');
  }

  async function removeEmail(address) {
    const res = await apiFetch(
      `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) throw new Error('remove_failed');
  }

  async function setPrimaryEmail(address) {
    await apiFetch(
      `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/primary`,
      { method: 'PUT' },
    );
  }

  function renderEmailList() {
    const listEl = root.querySelector('#email-list');
    if (!listEl) return;
    if (!emails.length) {
      listEl.innerHTML = `<li class="email-list-item"><span class="email-address">${i18n.t('ui.app.settings.emails_none')}</span></li>`;
      return;
    }
    listEl.innerHTML = emails.map((entry) => {
      const escaped = escapeHtml(entry.email);
      const primaryBadge = entry.primary
        ? `<span class="email-badge-primary">${i18n.t('ui.app.settings.emails_primary')}</span>`
        : `<button class="btn-animated" type="button" data-set-primary="${escaped}">${i18n.t('ui.app.settings.emails_set_primary')}</button>`;
      const removeBtn = `<button class="btn-animated" type="button" data-remove-email="${escaped}">${i18n.t('ui.app.settings.emails_remove')}</button>`;
      return `<li class="email-list-item"><span class="email-address">${escaped}</span>${primaryBadge}${removeBtn}</li>`;
    }).join('');
  }

  function showStatus(message) {
    const el = root.querySelector('#email-status');
    if (el) el.textContent = message;
  }

  function bindEmailActions() {
    root.addEventListener('click', async (evt) => {
      const target = evt.target;
      if (!(target instanceof HTMLElement)) return;

      const removeAttr = target.dataset.removeEmail;
      if (removeAttr) {
        try {
          await removeEmail(removeAttr);
          await loadEmails();
          renderEmailList();
        } catch {
          showStatus(i18n.t('ui.app.settings.emails_remove_failed'));
        }
        return;
      }

      const setPrimaryAttr = target.dataset.setPrimary;
      if (setPrimaryAttr) {
        await setPrimaryEmail(setPrimaryAttr);
        await loadEmails();
        renderEmailList();
        return;
      }

      if (target.id === 'email-add-btn') {
        const input = root.querySelector('#email-add-input');
        if (!(input instanceof HTMLInputElement)) return;
        const address = input.value.trim();
        if (!address) return;
        try {
          await addEmail(address);
          input.value = '';
          await loadEmails();
          renderEmailList();
        } catch {
          showStatus(i18n.t('ui.app.settings.emails_add_failed'));
        }
      }
    });
  }

  return {
    async init() {
      await loadEmails();
      renderEmailList();
      bindEmailActions();
    },
  };
}
