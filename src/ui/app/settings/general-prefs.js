import { escapeHtml } from '../../reuse/escape-html.js';
import { apiFetch } from '../../reuse/api-client.js';
import { openPopup } from '../../reuse/popup.js';
import { watchToken } from '../../reuse/validation-url.js';

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

  function showStatus(message) {
    const statusEl = root.querySelector('#email-status');
    if (statusEl) statusEl.textContent = message;
  }

  async function openVerifyPopup(address, watchTokenValue) {
    const escapedAddress = escapeHtml(address);
    let stopWatching = null;

    const action = await openPopup({
      title: i18n.t('ui.app.settings.emails_verify_title'),
      body: `
        <p class="email-verify-prompt">${i18n.t('ui.app.settings.emails_verify_prompt').replace('{email}', escapedAddress)}</p>
        <div class="email-verify-row">
          <input id="popup-verify-input" type="text" inputmode="numeric" maxlength="6"
            placeholder="${escapeHtml(i18n.t('ui.app.settings.emails_verify_placeholder'))}" />
          <button id="popup-verify-btn" class="btn-confirm btn-animated" type="button">
            ${escapeHtml(i18n.t('ui.app.settings.emails_verify_submit'))}
          </button>
        </div>
        <div id="popup-verify-status" class="notif-status-message" aria-live="polite"></div>
        <button data-popup-action="verified" type="button" style="display:none"></button>
      `,
      variant: 'info',
      actions: [{ id: 'cancel', label: i18n.t('ui.reuse.popup.cancel'), variant: 'cancel' }],
      onOpen(overlay) {
        overlay.querySelector('#popup-verify-btn').addEventListener('click', async () => {
          const input = overlay.querySelector('#popup-verify-input');
          const status = overlay.querySelector('#popup-verify-status');
          const code = input.value.trim();
          if (!code) return;
          try {
            await submitVerificationCode(address, code);
            overlay.querySelector('[data-popup-action="verified"]').click();
          } catch (err) {
            const errCode = err instanceof Error ? err.message : 'verify_failed';
            status.textContent = errCode === 'invalid_code'
              ? i18n.t('ui.app.settings.emails_verify_invalid')
              : i18n.t('ui.app.settings.emails_verify_failed');
          }
        });

        if (watchTokenValue) {
          stopWatching = watchToken({
            token: watchTokenValue,
            apiFetch,
            onConsumed() {
              overlay.querySelector('[data-popup-action="verified"]').click();
            },
          });
        }
      },
    });

    stopWatching?.();
    return action;
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
            const action = await openVerifyPopup(address, result.watchToken);
            if (action !== 'verified') {
              try { await removeEmail(address); } catch { /* ignore */ }
            }
            await loadEmails();
            renderEmailList();
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

