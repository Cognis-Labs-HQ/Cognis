/**
 * "Guests cannot view this page" blocking popup for share-guest sessions.
 *
 * When a share guest attempts to reach any dashboard route other than the
 * active share link (or the public login/register pages), this popup is
 * shown with Sign In / Register actions (styled with the standard themed
 * button classes) so the guest can leave the share session to create a
 * real account, or Dismiss to stay and return to the share link — mirroring
 * the back-navigation technique already used by `runtime-error-popup.js`.
 *
 * Public exports:
 *   ALLOWED_GUEST_ROUTE_BASES — route bases a share guest may load directly.
 *   isGuestAllowedPath(path) — whether a path is reachable by a share guest.
 *   openGuestBlockedPopup(options) — opens the blocking popup and performs
 *     the back-navigation once dismissed.
 *
 * Usage:
 *   import { openGuestBlockedPopup } from './guest-blocked-popup.js';
 *   await openGuestBlockedPopup({ currentRoutePath: '/dashboard' });
 *
 * @param {{ currentRoutePath?: string }} options
 * @returns {Promise<void>}
 */

import { openPopup } from "./popup.js";
import { createI18n } from "./i18n.js";
import { escapeHtml } from "./escape-html.js";
import { normalizeSameOriginRoutePath } from "./route-path.js";

export const ALLOWED_GUEST_ROUTE_BASES = ["/share", "/login", "/register"];

/**
 * Returns true when the given path is one a share guest may load directly
 * without being blocked (the active share page, or the public auth pages).
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isGuestAllowedPath(path) {
    const normalizedPath = String(path ?? "")
        .split("?")[0]
        .split("#")[0];
    return ALLOWED_GUEST_ROUTE_BASES.some(
        (base) =>
            normalizedPath === base || normalizedPath.startsWith(`${base}/`),
    );
}

let popupOpen = false;

export async function openGuestBlockedPopup({
    currentRoutePath = "",
    allowBackNavigation = true,
} = {}) {
    if (popupOpen) return;
    popupOpen = true;
    try {
        const i18n = await createI18n().catch(() => ({
            t(key) {
                const fallbackLabels = {
                    "ui.reuse.guest_blocked_title": "Access Restricted",
                    "ui.reuse.guest_blocked_message":
                        "Guests cannot view this page.",
                    "ui.reuse.dismiss": "Dismiss",
                    "ui.reuse.login": "Sign In",
                    "ui.reuse.register": "Register",
                };
                return fallbackLabels[key] ?? key;
            },
        }));
        const actionId = await openPopup({
            title: i18n.t("ui.reuse.guest_blocked_title"),
            variant: "warning",
            body: () =>
                `<p>${escapeHtml(i18n.t("ui.reuse.guest_blocked_message"))}</p>`,
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.dismiss"),
                    variant: "neutral",
                },
                {
                    id: "login",
                    label: i18n.t("ui.reuse.login"),
                    variant: "cancel",
                },
                {
                    id: "register",
                    label: i18n.t("ui.reuse.register"),
                    variant: "confirm",
                },
            ],
        });
        if (actionId === "login") {
            window.location.href = "/login";
            return;
        }
        if (actionId === "register") {
            window.location.href = "/register";
            return;
        }
        if (allowBackNavigation) {
            navigateBackFrom(currentRoutePath);
        }
    } finally {
        popupOpen = false;
    }
}

function navigateBackFrom(currentRoutePath) {
    if (typeof window === "undefined") return;
    const normalizedCurrentRoutePath = normalizeSameOriginRoutePath(
        currentRoutePath,
        { logFailures: false },
    );
    if (
        normalizedCurrentRoutePath &&
        window.location.pathname !== normalizedCurrentRoutePath
    ) {
        // Route already changed away from the blocked page; nothing to undo.
        return;
    }
    window.history.back();
}

/**
 * Installs a capturing click listener that intercepts same-origin internal
 * link clicks (e.g. the standard dashboard topbar's Dashboard/Settings/
 * Administration links rendered by the full-boilerplate share window) and
 * shows the guest-blocked popup instead of letting the browser navigate away
 * from the active share link.
 *
 * @param {{ root?: ParentNode, signal?: AbortSignal }} options
 * @returns {void}
 */
export function installGuestNavigationGuard({ root = document, signal } = {}) {
    root.addEventListener(
        "click",
        (event) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            )
                return;
            const anchor =
                event.target instanceof Element
                    ? event.target.closest("a[href]")
                    : null;
            if (!(anchor instanceof HTMLAnchorElement)) return;
            let destinationUrl;
            try {
                destinationUrl = new URL(anchor.href, window.location.href);
            } catch {
                return;
            }
            if (destinationUrl.origin !== window.location.origin) return;
            if (isGuestAllowedPath(destinationUrl.pathname)) return;
            event.preventDefault();
            openGuestBlockedPopup({ allowBackNavigation: false }).catch(
                (error) => {
                    console.error(
                        "[guest-blocked-popup] Failed to open popup:",
                        error,
                    );
                },
            );
        },
        { capture: true, signal },
    );
}
