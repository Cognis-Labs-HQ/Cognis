/**
 * Auth-gateway default hooks for the `authenticate-session` and `load-page`
 * client-side flows.
 *
 * Registers stage hooks on the shared `uiCtx` singleton:
 *
 * `validate-stored-token` — reads the JWT and account from localStorage,
 *   calls `/api/v1/users/:account/info` via apiFetch, and clears stale auth
 *   storage on failure. Returns `{ valid, reason, accountId, role }`.
 *
 * `enforce-setup-requirements` — when the token is valid, calls
 *   `/api/v1/auth/setup-status` to detect pending TFA/account-setup work.
 *   Returns `{ requiresSetup, redirectTo }`.
 *
 * `resolve-session` — assembles the final normalised session descriptor from
 *   prior stage results. This is the canonical result callers read. When a
 *   share token was attempted (`shareAttempted: true`) but failed to
 *   resolve, `requiresRedirect` stays false so the share page can render its
 *   own "share expired/deleted" fallback instead of being redirected to
 *   `/login`.
 *
 * `load-page` → `authenticate` — runs `authenticate-session` and redirects
 *   to `/login` (or `/settings#security` for TFA setup) when the session is
 *   invalid. Pages whose pathname is in `PUBLIC_AUTH_PATHNAMES` (i.e. `/login`
 *   and `/register`) are skipped entirely so they can load without a session
 *   and without triggering a redirect loop.
 */

import "/static/reuse/flow-registry.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { apiFetch } from "/static/reuse/api-client.js";

const AUTH_SETUP_CACHE_TTL_MS = 5_000;
let authSetupCacheExpiresAt = 0;
let authSetupRequiredCached = false;

function getFirstResult(stageResults, stageId) {
    return (stageResults[stageId] ?? [])[0] ?? null;
}

function clearStoredSession() {
    localStorage.removeItem("cognis_access_token");
    localStorage.removeItem("cognis_account");
    localStorage.removeItem("cognis_display_name");
    localStorage.removeItem("cognis_role");
    localStorage.removeItem("cognis_is_founder");
    localStorage.removeItem("cognis_provider_id");
    localStorage.removeItem("cognis_user_validation_mode");
    document.cookie = "cognis_access_token=; Path=/; Max-Age=0";
}

uiCtx.extendFlow(
    "authenticate-session",
    "validate-stored-token",
    { id: "auth-gateway:validate-stored-token" },
    async () => {
        const token = localStorage.getItem("cognis_access_token");
        const account = localStorage.getItem("cognis_account");
        if (!token || !account) {
            if (!token) {
                // No token at all — full clear to ensure no partial stale state.
                clearStoredSession();
            }
            // Token present without account = guest/share token; let
            // apply-alternate-auth handle it without wiping the token.
            return { valid: false, reason: "session_expired" };
        }
        try {
            const response = await apiFetch(
                "/api/v1/users/" + encodeURIComponent(account) + "/info",
            );
            if (response.ok) {
                const payload = await response.json().catch(() => null);
                if (payload?.data?.enabled === false) {
                    clearStoredSession();
                    return { valid: false, reason: "account_disabled" };
                }
                return {
                    valid: true,
                    reason: null,
                    accountId: account,
                    role: localStorage.getItem("cognis_role") ?? "user",
                };
            }
            if (response.status === 404) {
                clearStoredSession();
                return { valid: false, reason: "account_deleted" };
            }
            if (response.status === 401 || response.status === 403) {
                clearStoredSession();
                return { valid: false, reason: "session_expired" };
            }
        } catch {
            return { valid: false, reason: null };
        }
        clearStoredSession();
        return { valid: false, reason: "session_expired" };
    },
);

uiCtx.extendFlow(
    "authenticate-session",
    "enforce-setup-requirements",
    { id: "auth-gateway:enforce-setup-requirements" },
    async (stageCtx) => {
        const tokenResult = getFirstResult(
            stageCtx.stageResults,
            "validate-stored-token",
        );
        const alternateResult = getFirstResult(
            stageCtx.stageResults,
            "apply-alternate-auth",
        );
        if (!tokenResult?.valid && !alternateResult?.authenticated) {
            return { requiresSetup: false, redirectTo: null };
        }
        const normalizedHash = String(window.location.hash ?? "").toLowerCase();
        const isSecurityRoute =
            window.location.pathname === "/settings" &&
            normalizedHash === "#security";
        if (Date.now() < authSetupCacheExpiresAt) {
            if (!authSetupRequiredCached)
                return { requiresSetup: false, redirectTo: null };
            if (isSecurityRoute)
                return { requiresSetup: true, redirectTo: null };
            return { requiresSetup: true, redirectTo: "/settings#security" };
        }
        if (!localStorage.getItem("cognis_access_token")) {
            authSetupRequiredCached = false;
            authSetupCacheExpiresAt = Date.now() + AUTH_SETUP_CACHE_TTL_MS;
            return { requiresSetup: false, redirectTo: null };
        }
        try {
            const response = await apiFetch("/api/v1/auth/setup-status");
            authSetupRequiredCached = response.ok
                ? (await response.json().catch(() => null))?.data
                      ?.requiresSetup === true
                : false;
        } catch {
            authSetupRequiredCached = false;
        }
        authSetupCacheExpiresAt = Date.now() + AUTH_SETUP_CACHE_TTL_MS;
        if (!authSetupRequiredCached)
            return { requiresSetup: false, redirectTo: null };
        if (isSecurityRoute) return { requiresSetup: true, redirectTo: null };
        return { requiresSetup: true, redirectTo: "/settings#security" };
    },
);

uiCtx.extendFlow(
    "authenticate-session",
    "resolve-session",
    { id: "auth-gateway:resolve-session" },
    (stageCtx) => {
        const tokenResult = getFirstResult(
            stageCtx.stageResults,
            "validate-stored-token",
        );
        const alternateResult = getFirstResult(
            stageCtx.stageResults,
            "apply-alternate-auth",
        );
        const setupResult = getFirstResult(
            stageCtx.stageResults,
            "enforce-setup-requirements",
        );

        if (setupResult?.requiresSetup && setupResult.redirectTo) {
            return {
                authenticated: false,
                accountId: null,
                role: null,
                requiresRedirect: true,
                redirectTo: setupResult.redirectTo,
                shareContext: null,
                isGuestSession: false,
            };
        }

        const authenticated =
            tokenResult?.valid === true ||
            alternateResult?.authenticated === true;
        if (!authenticated) {
            if (alternateResult) {
                // A share token was present on this page (e.g. /share/:token)
                // but failed to resolve (expired, revoked, or invalid). The
                // share page owns rendering its own "share expired/deleted"
                // fallback screen for guests, so it must not be bounced to
                // /login here the way a normal expired session would be.
                return {
                    authenticated: false,
                    accountId: null,
                    role: null,
                    requiresRedirect: false,
                    redirectTo: null,
                    shareContext: null,
                    isGuestSession: false,
                    shareAttempted: true,
                };
            }
            const reason = tokenResult?.reason ?? null;
            const redirectTo = reason
                ? "/login?reason=" + encodeURIComponent(reason)
                : "/login";
            return {
                authenticated: false,
                accountId: null,
                role: null,
                requiresRedirect: true,
                redirectTo,
                shareContext: null,
                isGuestSession: false,
                shareAttempted: false,
            };
        }

        return {
            authenticated: true,
            accountId:
                tokenResult?.accountId ?? alternateResult?.accountId ?? null,
            role: tokenResult?.role ?? alternateResult?.role ?? "user",
            requiresRedirect: false,
            redirectTo: null,
            shareContext: alternateResult?.shareContext ?? null,
            isGuestSession: alternateResult?.isGuestSession === true,
            shareAttempted: alternateResult !== null,
        };
    },
);

export function invalidateAuthSetupCache() {
    authSetupCacheExpiresAt = 0;
    authSetupRequiredCached = false;
}

const PUBLIC_AUTH_PATHNAMES = new Set(["/login", "/register"]);

uiCtx.extendFlow(
    "load-page",
    "authenticate",
    { id: "auth-gateway:load-page-authenticate" },
    async (stageCtx) => {
        const mountFn = stageCtx.input?.mount;
        if (PUBLIC_AUTH_PATHNAMES.has(window.location.pathname)) {
            stageCtx.data.mountFn = mountFn;
            stageCtx.data.session = null;
            return { authenticated: false };
        }
        const flowResult = await uiCtx.runFlow("authenticate-session", {});
        const session =
            (flowResult?.stageResults?.["resolve-session"] ?? [])[0] ?? null;
        if (session?.requiresRedirect && session.redirectTo) {
            window.location.replace(session.redirectTo);
            stageCtx.data.redirected = true;
            return { authenticated: false, redirected: true };
        }
        stageCtx.data.mountFn = mountFn;
        stageCtx.data.session = session;
        return { authenticated: session?.authenticated === true };
    },
);

uiCtx.extendFlow(
    "load-page",
    "mount-page",
    { id: "auth-gateway:load-page-mount" },
    async (stageCtx) => {
        if (stageCtx.data.redirected) return { mounted: false };
        const mountFn = stageCtx.data.mountFn ?? stageCtx.input?.mount;
        if (typeof mountFn !== "function") return { mounted: false };
        const root = stageCtx.input?.root ?? null;
        await mountFn(root);
        return { mounted: true };
    },
);
