/**
 * Share-gateway hook for the `apply-alternate-auth` stage of the
 * `authenticate-session` client-side flow.
 *
 * When the current URL matches `/share/:token`, this hook resolves the
 * share token via the API and configures the share page's renderer via a
 * `shareContext` descriptor:
 *
 * - If the visitor already has a valid full-account session AND the server
 *   reports they have direct access to the resource through that account
 *   (e.g. they are the meeting owner or an invited participant), their
 *   session is left untouched — no token swap happens, so the resource
 *   renders normally under their own identity and every subsequent request
 *   continues to authenticate as themselves.
 * - Otherwise (anonymous visitor, or a logged-in user without direct
 *   access), localStorage is swapped to the guest access token for the
 *   duration of the page session, using the share token as a one-time means
 *   of accessing the resource — without the share page ever touching
 *   localStorage directly.
 *
 * Token lifecycle (guest path only):
 * - The prior access token is stashed in sessionStorage before the swap.
 * - A `beforeunload` listener (removed via AbortSignal) restores the prior
 *   token when the user leaves the share page.
 *
 * Once activated, the guest session stays recognised as authenticated (via
 * `GUEST_SESSION_ACTIVE_STORAGE_KEY`, shared with
 * `reuse/share-button.js`'s `isViewingAsGuest()`) for the remainder of the
 * tab, even on paths that no longer match `/share/:token`. This lets
 * client-side navigation to other dashboard routes mount long enough for the
 * guest-navigation guard (see `/static/reuse/guest-blocked-popup.js` and the
 * app router) to intercept it with a "Guests cannot view this page" popup
 * instead of silently bouncing the guest to `/login`.
 *
 * This file must be imported before the first `authenticate-session` flow
 * run on any share page. `share.html` imports it as a module script so the
 * hook is registered before `index.js` runs the flow.
 */

import "/static/reuse/page-flow-catalog.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { GUEST_SESSION_ACTIVE_STORAGE_KEY } from "./reuse/share-button.js";

const ACCESS_TOKEN_KEY = "cognis_access_token";
const PREV_ACCESS_TOKEN_KEY = "cognis_prev_access_token";
const GUEST_TOKEN_ACTIVE_KEY = GUEST_SESSION_ACTIVE_STORAGE_KEY;

function resolveShareTokenFromLocation() {
    const pathnameMatch = window.location.pathname.match(/^\/share\/([^/]+)$/);
    if (pathnameMatch) return decodeURIComponent(pathnameMatch[1]);
    return String(
        new URL(window.location.href).searchParams.get("token") ?? "",
    ).trim();
}

function activateGuestToken(guestAccessToken) {
    const normalized = String(guestAccessToken ?? "").trim();
    if (!normalized) return null;
    const prior = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (prior) {
        sessionStorage.setItem(PREV_ACCESS_TOKEN_KEY, prior);
    } else {
        sessionStorage.removeItem(PREV_ACCESS_TOKEN_KEY);
    }
    sessionStorage.setItem(GUEST_TOKEN_ACTIVE_KEY, "1");
    localStorage.setItem(ACCESS_TOKEN_KEY, normalized);
    return new AbortController();
}

function restoreGuestToken() {
    if (sessionStorage.getItem(GUEST_TOKEN_ACTIVE_KEY) !== "1") return;
    const prior = sessionStorage.getItem(PREV_ACCESS_TOKEN_KEY);
    if (prior) {
        localStorage.setItem(ACCESS_TOKEN_KEY, prior);
    } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    sessionStorage.removeItem(PREV_ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(GUEST_TOKEN_ACTIVE_KEY);
}

uiCtx.extendFlow(
    "authenticate-session",
    "apply-alternate-auth",
    { id: "share-gateway:apply-alternate-auth" },
    async (stageCtx) => {
        const shareToken = resolveShareTokenFromLocation();
        if (!shareToken) {
            if (sessionStorage.getItem(GUEST_TOKEN_ACTIVE_KEY) === "1") {
                // The guest session was already activated on the share page
                // itself; keep recognising it as authenticated on other
                // paths so the guest-navigation guard can intercept the
                // route with a blocked-page popup instead of the generic
                // auth flow silently redirecting to /login.
                return {
                    authenticated: true,
                    accountId: null,
                    role: "user",
                    isGuestSession: true,
                    shareContext: null,
                };
            }
            return null;
        }

        // If the visitor already has a valid full-account session, send
        // their existing token along so the server can check whether they
        // already have direct access to the shared resource through their
        // own account (e.g. they are the meeting owner or an invited
        // participant). Read this *before* any guest-token swap below.
        const priorSessionResult =
            (stageCtx.stageResults?.["validate-stored-token"] ?? [])[0] ?? null;
        const ownAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const headers =
            priorSessionResult?.valid && ownAccessToken
                ? { authorization: "Bearer " + ownAccessToken }
                : undefined;

        let response;
        try {
            response = await fetch(
                "/api/v1/share/resolve/" + encodeURIComponent(shareToken),
                headers ? { headers } : undefined,
            );
        } catch {
            return { authenticated: false, reason: "share_resolve_failed" };
        }

        if (!response.ok) {
            return {
                authenticated: false,
                reason:
                    response.status === 404
                        ? "share_not_found"
                        : "share_expired",
            };
        }

        const body = await response.json().catch(() => ({ data: null }));
        const shareData = body?.data ?? null;
        if (!shareData?.resourceType) {
            return { authenticated: false, reason: "share_malformed" };
        }

        const shareContext = {
            resourceType: shareData.resourceType,
            resourceId: shareData.resourceId ?? null,
            payload: shareData.payload ?? {},
            grantedCapabilities: Array.isArray(shareData.grantedCapabilities)
                ? shareData.grantedCapabilities
                : [],
            page: shareData.page ?? {},
            guestAccessToken: shareData.guestAccessToken ?? null,
        };

        if (priorSessionResult?.valid && shareData.directAccess === true) {
            // The logged-in visitor already has direct access to the
            // resource through their own account — render it using their
            // real session instead of downgrading them to a guest. No
            // token swap happens, so every subsequent request continues to
            // authenticate as the real account.
            return {
                authenticated: true,
                accountId: priorSessionResult.accountId,
                role: priorSessionResult.role,
                isGuestSession: false,
                shareContext,
            };
        }

        const abortController = activateGuestToken(shareData.guestAccessToken);
        if (abortController && stageCtx.data) {
            stageCtx.data.shareAbortController = abortController;
        }

        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", restoreGuestToken, {
                signal: abortController?.signal,
            });
        }

        return {
            authenticated: true,
            accountId: null,
            role: "user",
            isGuestSession: true,
            shareContext,
        };
    },
);
