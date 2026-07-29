/**
 * Resolves a received share while keeping password prompting and encrypted
 * keyring persistence in one reusable browser flow.
 *
 * Public exports:
 *   resolveReceivedShare(token, options) — resolves a share, prompting once
 *     on a password challenge and saving a verified password to the keyring.
 *   fetchProtectedShareResource(options) — loads a protected resource with a
 *     freshly validated keyring or prompted share password.
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

async function promptForPassword() {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    let passwordInput = null;
    let saveInput = null;
    const action = await openPopup({
        title: i18n.t("share.unlock.title"),
        body: `<div class="stack"><label class="stack"><span>${escapeHtml(i18n.t("share.unlock.message"))}</span><input id="share-unlock-password" type="password" autocomplete="current-password" required /></label><label><input id="share-unlock-save" type="checkbox" checked /> ${escapeHtml(i18n.t("share.unlock.save_to_keyring"))}</label></div>`,
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
            saveInput = overlay.querySelector("#share-unlock-save");
            passwordInput?.focus();
        },
        onAction(actionId) {
            return actionId !== "unlock" || Boolean(passwordInput?.value);
        },
    });
    return action === "unlock"
        ? {
              password: passwordInput?.value || "",
              saveToKeyring: saveInput?.checked !== false,
          }
        : null;
}

async function unlockKeyringForShare(i18n, shareId) {
    const requestUnlock = uiCtx.capabilities.get("keyring:requestUnlock");
    if (typeof requestUnlock !== "function") return false;
    return requestUnlock({
        request: {
            component: i18n.t("share.keyring.request_component"),
            action: i18n.t("share.keyring.request_action_access"),
            process: i18n
                .t("share.keyring.request_process")
                .replace("{{shareId}}", shareId),
        },
    });
}

export async function fetchProtectedShareResource({ shareId, request }) {
    const normalizedShareId = String(shareId ?? "").trim();
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    await unlockKeyringForShare(i18n, normalizedShareId);
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        "Share Gateway",
    );
    const keyringId = `share:${normalizedShareId}`;
    const storedPassword = keyring?.get(keyringId);
    let response = await request(storedPassword);
    if (response.status !== 401) return response;

    const entered = await promptForPassword();
    if (!entered?.password) return response;
    response = await request(entered.password);
    if (response.ok && entered.saveToKeyring) {
        try {
            if (!uiCtx.capabilities.get("keyring:isUnlocked")?.()) {
                throw new Error("keyring_locked");
            }
            await keyring?.set(keyringId, entered.password, {
                label: i18n.t("share.unlock.keyring_label"),
            });
        } catch {
            showToast(i18n.t("share.error.keyring_locked"), {
                variant: "warning",
            });
        }
    }
    return response;
}

export async function resolveReceivedShare(token, { headers } = {}) {
    const normalizedToken = String(token ?? "").trim();
    if (!normalizedToken) return null;
    const shareI18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    await unlockKeyringForShare(shareI18n, normalizedToken);
    const keyringId = `share:${normalizedToken}`;
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        "Share Gateway",
    );
    const keyringPassword = keyring?.get(keyringId);
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
    const entered = await promptForPassword();
    if (!entered?.password) return null;
    response = await request(entered.password);
    if (response.ok) {
        try {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            const payload = await response.clone().json();
            const shareId = String(payload?.data?.shareId ?? "").trim();
            if (
                entered.saveToKeyring &&
                uiCtx.capabilities.get("keyring:isUnlocked")?.()
            )
                await Promise.resolve(
                    keyring?.set(
                        shareId ? `share:${shareId}` : keyringId,
                        entered.password,
                        {
                            label: i18n.t("share.unlock.keyring_label"),
                        },
                    ),
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

uiCtx.capabilities.contribute(
    "share:fetchProtectedResource",
    fetchProtectedShareResource,
);
