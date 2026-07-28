/**
 * Resolves a received share while keeping password prompting and encrypted
 * keyring persistence in one reusable browser flow.
 *
 * Public exports:
 *   resolveReceivedShare(token, options) — resolves a share, prompting once
 *     on a password challenge and saving a verified password to the keyring.
 *
 * Usage:
 *   const result = await resolveReceivedShare(token, { headers });
 *
 * @param {string} token Share token from a notification or share URL.
 * @param {{ headers?: HeadersInit }} [options] Additional request headers.
 * @returns {Promise<Response|null>} Final response, or null when cancelled.
 */

import { createI18n } from "/static/reuse/i18n.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { showToast } from "/static/reuse/toast.js";
import "/static/reuse/keyring.js";

async function promptForPassword() {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    let passwordInput = null;
    const action = await openPopup({
        title: i18n.t("share.unlock.title"),
        body: `<label class="stack"><span>${escapeHtml(i18n.t("share.unlock.message"))}</span><input id="share-unlock-password" type="password" autocomplete="current-password" required /></label>`,
        actions: [
            {
                id: "unlock",
                label: i18n.t("share.unlock.action"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("share.unlock.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            passwordInput = overlay.querySelector("#share-unlock-password");
            passwordInput?.focus();
        },
        onAction(actionId) {
            return actionId !== "unlock" || Boolean(passwordInput?.value);
        },
    });
    return action === "unlock" ? passwordInput?.value || null : null;
}

export async function resolveReceivedShare(token, { headers } = {}) {
    const normalizedToken = String(token ?? "").trim();
    if (!normalizedToken) return null;
    const keyringId = `share:${normalizedToken}`;
    const keyringPassword = uiCtx.capabilities.get("keyring:get")?.(keyringId);
    const request = (password) => {
        const requestHeaders = new Headers(headers);
        if (password) requestHeaders.set("x-cognis-share-password", password);
        return fetch(
            `/api/v1/share/resolve/${encodeURIComponent(normalizedToken)}`,
            {
                headers: requestHeaders,
            },
        );
    };
    let response = await request(keyringPassword);
    if (response.status !== 401) return response;
    const password = await promptForPassword();
    if (!password) return null;
    response = await request(password);
    if (response.ok) {
        try {
            await Promise.resolve(
                uiCtx.capabilities.get("keyring:set")?.(keyringId, password),
            );
        } catch {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.keyring_locked"), {
                variant: "warning",
            });
        }
    }
    return response;
}
