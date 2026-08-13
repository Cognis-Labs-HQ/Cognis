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
 *   const result = await resolveReceivedShare(token);
 *
 * @param {string} token Share token from a notification or share URL.
 * @param {{ useAccountKeyring?: boolean }} [options] Account-keyring options.
 * @returns {Promise<Response|null>} Final response, or null when cancelled.
 */

import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { showToast } from "/static/reuse/toast.js";

async function promptForPassword({ allowSave = true } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    let passwordInput = null;
    let saveInput = null;
    const action = await openPopup({
        title: i18n.t("share.unlock.title"),
        body: `<div class="stack"><label class="stack"><span>${escapeHtml(i18n.t("share.unlock.message"))}</span><input id="share-unlock-password" type="password" autocomplete="current-password" required /></label>${allowSave ? `<label><input id="share-unlock-save" type="checkbox" checked /> ${escapeHtml(i18n.t("share.unlock.save_to_keyring"))}</label>` : ""}</div>`,
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
              saveToKeyring: allowSave && saveInput?.checked !== false,
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
    const keyringUnlocked = await unlockKeyringForShare(
        i18n,
        normalizedShareId,
    );
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        "Share Gateway",
    );
    const keyringId = `share:${normalizedShareId}`;
    const storedPassword = keyring?.get(keyringId);
    let response = await request(storedPassword);
    if (response.status !== 401) return response;

    const entered = await promptForPassword({ allowSave: keyringUnlocked });
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

export async function resolveReceivedShare(
    token,
    { useAccountKeyring = false } = {},
) {
    const normalizedToken = String(token ?? "").trim();
    if (!normalizedToken) return null;
    const keyringId = `share:${normalizedToken}`;
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        "Share Gateway",
    );
    const request = (password) => {
        const requestHeaders = new Headers();
        if (password) requestHeaders.set("x-cognis-share-password", password);
        return apiFetch(
            `/api/v1/share/resolve/${encodeURIComponent(normalizedToken)}`,
            {
                headers: requestHeaders,
                // A 401 is the expected password challenge for protected
                // shares, not evidence that the signed-in account expired.
                suppressAccessDeniedEvent: true,
            },
        );
    };
    let response = await request(null);
    if (response.status !== 401) return response;
    let keyringUnlocked = false;
    if (useAccountKeyring) {
        const shareI18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        keyringUnlocked = await unlockKeyringForShare(
            shareI18n,
            normalizedToken,
        );
        if (keyringUnlocked) {
            const keyringPassword = keyring?.get(keyringId);
            if (keyringPassword) {
                response = await request(keyringPassword);
                if (response.status !== 401) return response;
            }
        }
    }
    let entered = null;
    while (response.status === 401) {
        entered = await promptForPassword({
            allowSave: useAccountKeyring && keyringUnlocked,
        });
        if (!entered?.password) return null;
        response = await request(entered.password);
        if (response.status === 401) {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.invalid_password"), {
                variant: "error",
            });
        }
    }
    if (response.ok) {
        try {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            const payload = await response.clone().json();
            const shareId = String(payload?.data?.shareId ?? "").trim();
            if (
                useAccountKeyring &&
                entered.saveToKeyring &&
                uiCtx.capabilities.get("keyring:isUnlocked")?.()
            ) {
                const metadata = {
                    label: i18n.t("share.unlock.keyring_label"),
                    shareId,
                };
                const identifiers = [keyringId];
                if (shareId) identifiers.push(`share:${shareId}`);
                await Promise.all(
                    [...new Set(identifiers)].map((identifier) =>
                        Promise.resolve(
                            keyring?.set(
                                identifier,
                                entered.password,
                                metadata,
                            ),
                        ),
                    ),
                );
            }
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

export async function resolveAccountShare(
    shareId,
    { passwordProtected = false } = {},
) {
    const normalizedShareId = String(shareId ?? "").trim();
    if (!normalizedShareId) return null;
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        "Share Gateway",
    );
    const keyringId = `share:${normalizedShareId}`;
    const request = (password) =>
        apiFetch(
            `/api/v1/share/account/${encodeURIComponent(normalizedShareId)}/resolve`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password: password || undefined }),
                suppressAccessDeniedEvent: true,
            },
        );
    let response = passwordProtected ? null : await request(null);
    if (passwordProtected) {
        response = new Response(null, { status: 401 });
    }
    if (response.status !== 401) {
        return response.ok ? response.json() : response;
    }
    const keyringUnlocked = await unlockKeyringForShare(
        i18n,
        normalizedShareId,
    );
    if (keyringUnlocked) {
        const storedPassword = keyring?.get(keyringId);
        if (storedPassword) {
            response = await request(storedPassword);
            if (response.status !== 401) {
                return response.ok ? response.json() : response;
            }
        }
    }
    while (response.status === 401) {
        const entered = await promptForPassword({ allowSave: keyringUnlocked });
        if (!entered?.password) return null;
        response = await request(entered.password);
        if (response.status === 401) {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.invalid_password"), {
                variant: "error",
            });
        }
        if (response.ok && entered.saveToKeyring) {
            await keyring?.set(keyringId, entered.password, {
                label: i18n.t("share.unlock.keyring_label"),
                shareId: normalizedShareId,
            });
        }
    }
    if (!response.ok) return response;
    return response.json();
}

uiCtx.capabilities.contribute(
    "share:fetchProtectedResource",
    fetchProtectedShareResource,
);
