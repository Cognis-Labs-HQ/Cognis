/**
 * Provides the browser's canonical account-session classification.
 *
 * Public exports:
 * - `isGuestSession()` — reports whether the active account context is a guest.
 *
 * Usage example:
 * ```js
 * import { isGuestSession } from "/static/reuse/account-context.js";
 * if (isGuestSession()) disableAccountOnlyControls();
 * ```
 *
 * @returns {boolean} Whether the current browser account context is a guest.
 */
import { uiCtx } from "./ui-ctx.js";

export function isGuestSession() {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    const providerId = String(localStorage.getItem("cognis_provider_id") ?? "")
        .trim()
        .toLowerCase();
    const role = String(localStorage.getItem("cognis_role") ?? "")
        .trim()
        .toLowerCase();
    return (
        accountId.startsWith("share:") ||
        ["guest", "share"].includes(providerId) ||
        role === "guest"
    );
}

uiCtx.capabilities.contribute("session:isGuest", isGuestSession);
