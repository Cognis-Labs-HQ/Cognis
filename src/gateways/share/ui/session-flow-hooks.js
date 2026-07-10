/**
 * Share-gateway hook for the `apply-alternate-auth` stage of the
 * `authenticate-session` client-side flow.
 *
 * When the current URL matches `/share/:token`, this hook resolves the
 * share token via the API, swaps localStorage to the guest access token
 * for the duration of the page session, and returns an `authenticated`
 * result carrying a `shareContext` descriptor that the share page reads
 * to configure its renderer — without the share page ever touching
 * localStorage directly.
 *
 * Token lifecycle:
 * - The prior access token is stashed in sessionStorage before the swap.
 * - A `beforeunload` listener (removed via AbortSignal) restores the prior
 *   token when the user leaves the share page.
 *
 * This file must be imported before the first `authenticate-session` flow
 * run on any share page. `share.html` imports it as a module script so the
 * hook is registered before `index.js` runs the flow.
 */

import "/static/reuse/page-flow-catalog.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const ACCESS_TOKEN_KEY = "cognis_access_token";
const PREV_ACCESS_TOKEN_KEY = "cognis_prev_access_token";
const GUEST_TOKEN_ACTIVE_KEY = "cognis_share_guest_token_active";

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
        if (!shareToken) return null;

        const guestController = activateGuestToken;

        let response;
        try {
            response = await fetch(
                "/api/v1/share/resolve/" + encodeURIComponent(shareToken),
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

        const abortController = activateGuestToken(shareData.guestAccessToken);
        if (abortController && stageCtx.data) {
            stageCtx.data.shareAbortController = abortController;
        }

        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", restoreGuestToken);
        }

        return {
            authenticated: true,
            accountId: null,
            role: "user",
            shareContext: {
                resourceType: shareData.resourceType,
                resourceId: shareData.resourceId ?? null,
                payload: shareData.payload ?? {},
                grantedCapabilities: Array.isArray(
                    shareData.grantedCapabilities,
                )
                    ? shareData.grantedCapabilities
                    : [],
                page: shareData.page ?? {},
                guestAccessToken: shareData.guestAccessToken ?? null,
            },
        };
    },
);
