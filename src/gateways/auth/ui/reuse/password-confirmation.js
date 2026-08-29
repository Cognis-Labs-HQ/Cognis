/**
 * Authentication gateway password confirmation client.
 *
 * Public exports:
 *   confirmPassword(password) — confirms the active account through its
 *     authentication provider.
 *   createRepromptGuard(options) — wraps a sensitive action in the shared
 *     password confirmation popup.
 *   invalidatePasswordConfirmation() — makes the next confirmation prompt.
 *
 * Usage:
 *   const confirm = uiCtx.capabilities.get('auth:confirmPassword');
 *   if (await confirm(password)) await performSensitiveAction();
 *
 * @param {string} password Current account password, or empty to reuse a fresh
 *   confirmation window.
 * @returns {Promise<boolean>} Whether the active account was confirmed.
 */
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createPasswordConfirmationGuard } from "./password-confirmation-guard.js";

export async function confirmPassword(password = "") {
    const body = password ? { password } : {};
    const response = await apiFetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        suppressAccessDeniedEvent: true,
    });
    return response.ok;
}

export async function invalidatePasswordConfirmation() {
    if (uiCtx.capabilities.get("session:isAuthenticated")?.() !== true) {
        return true;
    }
    const response = await apiFetch("/api/v1/auth/verify", {
        method: "DELETE",
        suppressAccessDeniedEvent: true,
    });
    return response.ok;
}

export function createRepromptGuard({
    i18n,
    confirmPasswordImpl = confirmPassword,
    openPopupImpl = openPopup,
}) {
    return createPasswordConfirmationGuard({
        i18n,
        confirmPasswordImpl,
        openPopupImpl,
        escapeHtmlImpl: escapeHtml,
    });
}

uiCtx.capabilities.contribute("auth:confirmPassword", confirmPassword);
uiCtx.capabilities.contribute("auth:createRepromptGuard", createRepromptGuard);
uiCtx.capabilities.contribute(
    "auth:invalidatePasswordConfirmation",
    invalidatePasswordConfirmation,
);
