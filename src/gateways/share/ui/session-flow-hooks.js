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
import { resolveReceivedShare } from "./received-share.js";
import { apiFetch } from "/static/reuse/api-client.js";
import {
    GUEST_SESSION_ACTIVE_STORAGE_KEY,
    isViewingAsGuest,
} from "./reuse/share-button.js";
import {
    listenForShareRevocation,
    publishShareRevoked,
} from "./session-events.js";
import { stopShareStatusWatch, watchShareStatus } from "./status-monitor.js";

const ACCESS_TOKEN_KEY = "cognis_access_token";
const PREV_ACCESS_TOKEN_KEY = "cognis_prev_access_token";
const PREV_ACCOUNT_KEY = "cognis_prev_account";
const PREV_DISPLAY_NAME_KEY = "cognis_prev_display_name";
const GUEST_TOKEN_ACTIVE_KEY = GUEST_SESSION_ACTIVE_STORAGE_KEY;
const DISPLAY_NAME_KEY = "cognis_display_name";
const ACCOUNT_KEY = "cognis_account";
const ACCESS_DENIED_TOKEN_KEY = "cognis_share_access_denied_token";
let activeGuestSession = null;
let activeShareSession = null;
let accessDeniedNavigationPending = false;
let activeGuestKeyring = null;

function hasStoredAccountSession() {
    const token = String(localStorage.getItem(ACCESS_TOKEN_KEY) ?? "").trim();
    const accountId = String(localStorage.getItem(ACCOUNT_KEY) ?? "").trim();
    return Boolean(token && accountId && !accountId.startsWith("share:"));
}

function discardStaleGuestMarkers() {
    stopShareStatusMonitor();
    sessionStorage.removeItem(PREV_ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(PREV_ACCOUNT_KEY);
    sessionStorage.removeItem(PREV_DISPLAY_NAME_KEY);
    sessionStorage.removeItem(GUEST_TOKEN_ACTIVE_KEY);
    delete document.body.dataset.shareGuest;
    activeGuestSession = null;
    activeShareSession = null;
}

function stopShareStatusMonitor() {
    stopShareStatusWatch();
}

function startShareStatusMonitor(shareId) {
    stopShareStatusMonitor();
    if (!shareId) return;
    watchShareStatus(shareId, () => publishShareRevoked(shareId));
}

window.addEventListener("cognis:api-access-denied", () => {
    if (accessDeniedNavigationPending) return;
    const shareToken = activeShareSession?.shareToken;
    const contentUrl = activeShareSession?.session?.shareContext?.contentUrl;
    if (!shareToken || !contentUrl) return;
    const activeUrl = new URL(window.location.href);
    const expectedUrl = new URL(contentUrl, window.location.origin);
    if (
        activeUrl.pathname !== expectedUrl.pathname ||
        activeUrl.search !== expectedUrl.search
    )
        return;
    sessionStorage.setItem(ACCESS_DENIED_TOKEN_KEY, shareToken);
    accessDeniedNavigationPending = true;
    restoreGuestToken();
    const navigate = uiCtx.capabilities.get("ui:navigate");
    Promise.resolve(
        navigate?.(`/share/${encodeURIComponent(shareToken)}`) ?? false,
    )
        .then((navigated) => {
            if (!navigated) {
                window.location.assign(
                    `/share/${encodeURIComponent(shareToken)}`,
                );
            }
        })
        .finally(() => {
            accessDeniedNavigationPending = false;
        });
});

uiCtx.capabilities.contribute("session:ensureGuestKeyring", async () => {
    if (!isViewingAsGuest() || !activeGuestKeyring) return false;
    const activateTemporaryKeyring = uiCtx.capabilities.get(
        "keyring:activateTemporary",
    );
    return Boolean(
        await activateTemporaryKeyring?.(
            activeGuestKeyring.accountId,
            activeGuestKeyring.passphrase,
        ),
    );
});
uiCtx.capabilities.contribute("session:isGuestAllowedPath", (path) => {
    const contentUrl = activeGuestSession?.session?.shareContext?.contentUrl;
    if (!contentUrl) return false;
    const expectedUrl = new URL(contentUrl, window.location.origin);
    const requestedUrl = new URL(path, window.location.origin);
    return (
        expectedUrl.pathname === requestedUrl.pathname &&
        expectedUrl.search === requestedUrl.search
    );
});

const SHARE_GUEST_PAGE_DEFAULTS = Object.freeze({
    showNavbar: false,
    showShareControls: false,
});

function resolveShareTokenFromRoute(routePath) {
    const routeUrl = new URL(
        String(routePath ?? window.location.href),
        window.location.origin,
    );
    const pathnameMatch = routeUrl.pathname.match(/^\/share\/(shr_[^/]+)$/);
    if (pathnameMatch) return decodeURIComponent(pathnameMatch[1]);
    const queryToken = String(routeUrl.searchParams.get("token") ?? "").trim();
    return queryToken.startsWith("shr_") ? queryToken : "";
}

function isActiveShareContentRoute(activeSession) {
    const contentUrl = activeSession?.session?.shareContext?.contentUrl;
    if (!contentUrl) return false;
    const expectedUrl = new URL(contentUrl, window.location.origin);
    return (
        expectedUrl.pathname === window.location.pathname &&
        expectedUrl.search === window.location.search
    );
}

function resolveActiveShareContentSession(activeSession) {
    const session = activeSession?.session;
    if (!session || session.isGuestSession === true) return session ?? null;
    return {
        ...session,
        shareContext: null,
    };
}

async function activateGuestToken(
    guestAccessToken,
    guestProfile = null,
    guestKeyring = null,
) {
    const normalized = String(guestAccessToken ?? "").trim();
    if (!normalized) return null;
    const guestSessionAlreadyActive = isViewingAsGuest();
    const prior = localStorage.getItem(ACCESS_TOKEN_KEY);
    const priorAccount = localStorage.getItem(ACCOUNT_KEY);
    const priorDisplayName = localStorage.getItem(DISPLAY_NAME_KEY);
    const hasAccountSession = hasStoredAccountSession();
    if (!guestSessionAlreadyActive || hasAccountSession) {
        if (prior) {
            sessionStorage.setItem(PREV_ACCESS_TOKEN_KEY, prior);
        } else {
            sessionStorage.removeItem(PREV_ACCESS_TOKEN_KEY);
        }
        if (priorAccount) {
            sessionStorage.setItem(PREV_ACCOUNT_KEY, priorAccount);
        } else {
            sessionStorage.removeItem(PREV_ACCOUNT_KEY);
        }
        if (priorDisplayName) {
            sessionStorage.setItem(PREV_DISPLAY_NAME_KEY, priorDisplayName);
        } else {
            sessionStorage.removeItem(PREV_DISPLAY_NAME_KEY);
        }
    }
    sessionStorage.setItem(GUEST_TOKEN_ACTIVE_KEY, "1");
    document.body.dataset.shareGuest = "true";
    localStorage.setItem(ACCESS_TOKEN_KEY, normalized);
    const guestKeyringAccountId = String(guestKeyring?.accountId ?? "").trim();
    const guestKeyringPassphrase = String(guestKeyring?.passphrase ?? "");
    if (guestKeyringAccountId && guestKeyringPassphrase) {
        activeGuestKeyring = {
            accountId: guestKeyringAccountId,
            passphrase: guestKeyringPassphrase,
        };
        localStorage.setItem(ACCOUNT_KEY, guestKeyringAccountId);
        const activateTemporaryKeyring = uiCtx.capabilities.get(
            "keyring:activateTemporary",
        );
        const activated = await activateTemporaryKeyring?.(
            guestKeyringAccountId,
            guestKeyringPassphrase,
        );
        if (!activated) {
            restoreGuestToken();
            return null;
        }
    } else {
        localStorage.removeItem(ACCOUNT_KEY);
    }
    const displayName = String(guestProfile?.displayName ?? "").trim();
    if (displayName) localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    return new AbortController();
}

function restoreGuestToken() {
    stopShareStatusMonitor();
    if (sessionStorage.getItem(GUEST_TOKEN_ACTIVE_KEY) !== "1") return;
    uiCtx.capabilities.get("keyring:endTemporary")?.();
    activeGuestKeyring = null;
    const prior = sessionStorage.getItem(PREV_ACCESS_TOKEN_KEY);
    const priorAccount = sessionStorage.getItem(PREV_ACCOUNT_KEY);
    const priorDisplayName = sessionStorage.getItem(PREV_DISPLAY_NAME_KEY);
    if (prior) {
        localStorage.setItem(ACCESS_TOKEN_KEY, prior);
    } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (priorAccount) {
        localStorage.setItem(ACCOUNT_KEY, priorAccount);
    } else {
        localStorage.removeItem(ACCOUNT_KEY);
    }
    if (priorDisplayName) {
        localStorage.setItem(DISPLAY_NAME_KEY, priorDisplayName);
    } else {
        localStorage.removeItem(DISPLAY_NAME_KEY);
    }
    sessionStorage.removeItem(PREV_ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(PREV_ACCOUNT_KEY);
    sessionStorage.removeItem(PREV_DISPLAY_NAME_KEY);
    sessionStorage.removeItem(GUEST_TOKEN_ACTIVE_KEY);
    delete document.body.dataset.shareGuest;
    activeGuestSession = null;
    activeShareSession = null;
}

listenForShareRevocation((shareId) => {
    const activeShareId = String(
        activeShareSession?.session?.shareContext?.shareId ?? "",
    );
    if (!shareId || shareId !== activeShareId) return;
    const shareToken = activeShareSession?.shareToken;
    if (!shareToken) return;
    sessionStorage.setItem(ACCESS_DENIED_TOKEN_KEY, shareToken);
    restoreGuestToken();
    const sharePath = `/share/${encodeURIComponent(shareToken)}`;
    const navigate = uiCtx.capabilities.get("ui:navigate");
    Promise.resolve(navigate?.(sharePath) ?? false).then((navigated) => {
        if (!navigated) window.location.assign(sharePath);
    });
});

window.addEventListener("cognis:notification-arrival", (event) => {
    const notification = event.detail?.notification;
    if (notification?.category !== "share") return;
    const shareId = String(notification.metadata?.shareId ?? "").trim();
    if (!shareId) return;
    window.dispatchEvent(
        new CustomEvent("cognis:share-revoked", { detail: { shareId } }),
    );
});

uiCtx.extendFlow(
    "authenticate-session",
    "validate-stored-token",
    { id: "share-gateway:restore-account-session", order: -100 },
    (stageCtx) => {
        const shareToken = resolveShareTokenFromRoute(
            stageCtx.input?.routePath,
        );
        const hasAccountSession = hasStoredAccountSession();
        if (isViewingAsGuest() && hasAccountSession) {
            discardStaleGuestMarkers();
            return null;
        }
        if (shareToken.startsWith("shr_")) return null;
        if (isViewingAsGuest()) {
            restoreGuestToken();
        }
        return null;
    },
);

uiCtx.extendFlow(
    "authenticate-session",
    "apply-alternate-auth",
    { id: "share-gateway:apply-alternate-auth" },
    async (stageCtx) => {
        const shareToken = resolveShareTokenFromRoute(
            stageCtx.input?.routePath,
        );
        if (!shareToken) {
            if (isActiveShareContentRoute(activeShareSession)) {
                return resolveActiveShareContentSession(activeShareSession);
            }
            if (isViewingAsGuest()) restoreGuestToken();
            return null;
        }
        if (
            isViewingAsGuest() &&
            sessionStorage.getItem(PREV_ACCESS_TOKEN_KEY)
        ) {
            restoreGuestToken();
        }
        if (sessionStorage.getItem(ACCESS_DENIED_TOKEN_KEY) === shareToken) {
            sessionStorage.removeItem(ACCESS_DENIED_TOKEN_KEY);
            return { authenticated: false, reason: "share_access_denied" };
        }

        if (activeShareSession?.shareToken === shareToken) {
            return activeShareSession.session;
        }

        // If the visitor already has a valid full-account session, send
        // their existing token along so the server can check whether they
        // already have direct access to the shared resource through their
        // own account (e.g. they are the meeting owner or an invited
        // participant). Read this *before* any guest-token swap below.
        const priorSessionResult =
            (stageCtx.stageResults?.["validate-stored-token"] ?? [])[0] ?? null;
        const ownAccountId = String(
            localStorage.getItem(ACCOUNT_KEY) ?? "",
        ).trim();
        const hasValidatedAccountSession =
            priorSessionResult?.valid === true &&
            !isViewingAsGuest() &&
            !ownAccountId.startsWith("share:");
        let response;
        try {
            response = await resolveReceivedShare(shareToken, {
                useAccountKeyring: hasValidatedAccountSession,
            });
        } catch {
            return {
                authenticated: false,
                reason: "share_resolve_failed",
            };
        }

        if (!response) {
            return {
                authenticated: false,
                reason: "share_unlock_cancelled",
            };
        }

        if (!response.ok) {
            const wasDeniedWhileOpen =
                sessionStorage.getItem(ACCESS_DENIED_TOKEN_KEY) === shareToken;
            if (wasDeniedWhileOpen) {
                sessionStorage.removeItem(ACCESS_DENIED_TOKEN_KEY);
            }
            const errorPayload = await response
                .clone()
                .json()
                .catch(() => null);
            const errorCode = String(errorPayload?.error?.code ?? "");
            return {
                authenticated: false,
                reason: wasDeniedWhileOpen
                    ? "share_access_denied"
                    : errorCode === "recipient_restricted" ||
                        errorCode === "forbidden"
                      ? "share_access_denied"
                      : response.status === 404
                        ? "share_not_found"
                        : "share_expired",
            };
        }

        const body = await response.json().catch(() => ({ data: null }));
        const shareData = body?.data ?? null;
        if (!shareData?.resourceType) {
            return { authenticated: false, reason: "share_malformed" };
        }
        const isUserShare = Array.isArray(shareData.accessControls?.recipients)
            ? shareData.accessControls.recipients.some(
                  (recipient) => recipient?.type === "user",
              )
            : false;
        if (isUserShare && shareData.directAccess !== true) {
            return {
                authenticated: false,
                reason: "recipient_restricted",
            };
        }

        const shareContext = {
            shareId: String(shareData.shareId ?? ""),
            resourceType: shareData.resourceType,
            resourceId: shareData.resourceId ?? null,
            payload: shareData.payload ?? {},
            contentUrl: String(shareData.contentUrl ?? "").trim(),
            grantedCapabilities: Array.isArray(shareData.grantedCapabilities)
                ? shareData.grantedCapabilities
                : [],
            page: {
                ...SHARE_GUEST_PAGE_DEFAULTS,
                ...(shareData.page ?? {}),
            },
            guestAccessToken: shareData.guestAccessToken ?? null,
            guestProfile: shareData.guestProfile ?? null,
            guestKeyring: shareData.guestKeyring ?? null,
            directAccess: shareData.directAccess === true,
        };

        if (shareData.directAccess === true) {
            // Logged-in recipients retain their full account session. The
            // renderer receives the scoped guest token separately for
            // share-only API calls, so notification navigation never swaps
            // localStorage credentials or appears to log the user out.
            const accountSession = {
                authenticated: true,
                accountId: priorSessionResult?.accountId ?? ownAccountId,
                role:
                    priorSessionResult?.role ??
                    localStorage.getItem("cognis_role") ??
                    "user",
                isGuestSession: false,
                shareContext,
            };
            activeShareSession = { shareToken, session: accountSession };
            startShareStatusMonitor(shareContext.shareId);
            return accountSession;
        }

        if (!shareToken.startsWith("shr_")) {
            return { authenticated: false, reason: "recipient_restricted" };
        }
        const abortController = await activateGuestToken(
            shareData.guestAccessToken,
            shareData.guestProfile,
            shareData.guestKeyring,
        );
        if (abortController && stageCtx.data) {
            stageCtx.data.shareAbortController = abortController;
        }

        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", restoreGuestToken, {
                signal: abortController?.signal,
            });
        }

        const guestSession = {
            authenticated: true,
            accountId: null,
            role: "user",
            isGuestSession: true,
            shareContext,
        };
        activeGuestSession = { shareToken, session: guestSession };
        activeShareSession = activeGuestSession;
        startShareStatusMonitor(shareContext.shareId);
        return guestSession;
    },
);
