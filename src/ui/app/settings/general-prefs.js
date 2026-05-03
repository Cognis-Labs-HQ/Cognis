import { escapeHtml } from '../../reuse/escape-html.js';
import { apiFetch } from '../../reuse/api-client.js';
import { openPopup } from '../../reuse/popup.js';

/**
 * General preferences sub-module for the Settings page.
 *
 * Manages the user's email addresses: listing, adding, removing,
 * setting a primary address, and verifying new addresses via a TFA code.
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
  let pendingVerificationEmail = null;

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
    if (res.status === 429) throw new Error('rate_limited');
    if (!res.ok) throw new Error('add_failed');
    const payload = await res.json();
    return payload.data ?? {};
  }

  async function removeEmail(address) {
    const res = await apiFetch(
      `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}`,
      { method: 'DELETE' },
    );
    if (res.status === 409) {
      const payload = await res.json();
      const code = payload?.error?.code ?? 'remove_failed';
      throw new Error(code);
    }
    if (!res.ok) throw new Error('remove_failed');
  }

  async function setPrimaryEmail(address) {
    await apiFetch(
      `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/primary`,
      { method: 'PUT' },
    );
  }

  async function submitVerificationCode(address, code) {
    const res = await apiFetch(
      `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/verify`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    );
    if (res.status === 422) throw new Error('invalid_code');
    if (!res.ok) throw new Error('verify_failed');
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
      const verifiedBadge = entry.verified
        ? ''
        : `<span class="email-badge-unverified">${i18n.t('ui.app.settings.emails_unverified')}</span>`;
      const primaryBadge = entry.primary
        ? `<span class="email-badge-primary">${i18n.t('ui.app.settings.emails_primary')}</span>`
        : `<button class="btn-animated" type="button" data-set-primary="${escaped}">${i18n.t('ui.app.settings.emails_set_primary')}</button>`;
      const removeBtn = entry.primary
        ? ''
        : `<button class="btn-animated" type="button" data-remove-email="${escaped}">${i18n.t('ui.app.settings.emails_remove')}</button>`;
      return `<li class="email-list-item"><span class="email-address">${escaped}</span>${verifiedBadge}${primaryBadge}${removeBtn}</li>`;
    }).join('');
  }

  function renderVerificationPrompt(address) {
    const statusEl = root.querySelector('#email-status');
    if (!statusEl) return;
    const escaped = escapeHtml(address);
    statusEl.innerHTML = `
      <p class="email-verify-prompt">${i18n.t('ui.app.settings.emails_verify_prompt').replace('{email}', escaped)}</p>
      <div class="email-verify-row">
        <input id="email-verify-input" type="text" inputmode="numeric" maxlength="6"
          placeholder="${i18n.t('ui.app.settings.emails_verify_placeholder')}" />
        <button id="email-verify-btn" class="btn-confirm btn-animated" type="button">
          ${i18n.t('ui.app.settings.emails_verify_submit')}
        </button>
      </div>
      <div id="email-verify-status" aria-live="polite"></div>
    `;
  }

  function clearVerificationPrompt() {
    const statusEl = root.querySelector('#email-status');
    if (statusEl) statusEl.innerHTML = '';
    pendingVerificationEmail = null;
  }

  function showStatus(message) {
    const statusEl = root.querySelector('#email-status');
    if (statusEl) statusEl.textContent = message;
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
        } catch (err) {
          const code = err instanceof Error ? err.message : 'remove_failed';
          if (code === 'cannot_remove_primary_email') {
            await openPopup({
              title: i18n.t('ui.app.settings.emails_remove_primary_title'),
              body: i18n.t('ui.app.settings.emails_remove_primary_body'),
              variant: 'info',
              actions: [{ id: 'close', label: i18n.t('ui.reuse.generic.done'), variant: 'confirm' }],
            });
          } else {
            showStatus(i18n.t('ui.app.settings.emails_remove_failed'));
          }
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
          const result = await addEmail(address);
          input.value = '';
          await loadEmails();
          renderEmailList();
          if (result.pendingVerification) {
            pendingVerificationEmail = address;
            renderVerificationPrompt(address);
          }
        } catch (err) {
          const code = err instanceof Error ? err.message : 'add_failed';
          if (code === 'rate_limited') {
            showStatus(i18n.t('ui.app.settings.emails_verify_rate_limited'));
          } else {
            showStatus(i18n.t('ui.app.settings.emails_add_failed'));
          }
        }
        return;
      }

      if (target.id === 'email-verify-btn') {
        const codeInput = root.querySelector('#email-verify-input');
        if (!(codeInput instanceof HTMLInputElement)) return;
        const code = codeInput.value.trim();
        const verifyStatus = root.querySelector('#email-verify-status');
        if (!code || !pendingVerificationEmail) return;
        try {
          await submitVerificationCode(pendingVerificationEmail, code);
          clearVerificationPrompt();
          await loadEmails();
          renderEmailList();
        } catch (err) {
          const errCode = err instanceof Error ? err.message : 'verify_failed';
          if (verifyStatus) {
            verifyStatus.textContent = errCode === 'invalid_code'
              ? i18n.t('ui.app.settings.emails_verify_invalid')
              : i18n.t('ui.app.settings.emails_verify_failed');
          }
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
