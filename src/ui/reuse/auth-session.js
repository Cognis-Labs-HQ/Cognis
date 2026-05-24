const AUTH_SETUP_REQUIREMENT_CACHE_TTL_MS = 5_000;
let authSetupRequirementExpiresAt = 0;
let authSetupRequired = false;

function invalidateAuthSetupRequirementCache() {
    authSetupRequirementExpiresAt = 0;
    authSetupRequired = false;
}

async function enforceAuthSetupIfRequired() {
    const token = localStorage.getItem("cognis_access_token");
    if (!token) return false;
    if (Date.now() >= authSetupRequirementExpiresAt) {
        try {
            const response = await fetch("/api/v1/auth/setup-status", {
                headers: { authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const payload = await response.json().catch(() => null);
                authSetupRequired = payload?.data?.requiresSetup === true;
            } else {
                authSetupRequired = false;
            }
        } catch {
            authSetupRequired = false;
        }
        authSetupRequirementExpiresAt =
            Date.now() + AUTH_SETUP_REQUIREMENT_CACHE_TTL_MS;
    }
    if (!authSetupRequired) {
        return false;
    }
    const normalizedHash =
        typeof window.location.hash === "string"
            ? window.location.hash.toLowerCase()
            : "";
    const isSecuritySettingsRoute =
        window.location.pathname === "/settings" &&
        normalizedHash === "#security";
    if (isSecuritySettingsRoute) {
        return false;
    }
    window.location.replace("/settings#security");
    return true;
}

/**
 * Auth-session helpers for public auth pages.
 *
 * Public exports:
 * - redirectToDashboardIfAuthenticated() — validates the stored API token and
 *   redirects to `/dashboard` only when still valid; clears stale auth storage
 *   when invalid.
 * - checkIsAuthenticated() — validates the stored API token and returns true
 *   when still valid, without performing any redirect.
 * - ensureFullAccountSession() — redirects dashboard-shell pages to login unless
 *   local storage contains a token/account pair that resolves to an enabled user.
 *   Also redirects to /settings#security when TFA setup is required before
 *   proceeding.
 *
 * Usage:
 *   const redirected = await redirectToDashboardIfAuthenticated();
 *   if (redirected) await new Promise(() => {});
 *
 * @returns {Promise<boolean>}
 */
async function validateStoredAccountSession() {
    const token = localStorage.getItem("cognis_access_token");
    const account = localStorage.getItem("cognis_account");
    if (!token || !account) {
        clearStoredAuthSession();
        return { authenticated: false, reason: "session_expired" };
    }

    try {
        const response = await fetch(
            `/api/v1/users/${encodeURIComponent(account)}/info`,
            {
                headers: { authorization: `Bearer ${token}` },
            },
        );
        if (response.ok) {
            const payload = await response.json().catch(() => null);
            if (payload?.data?.enabled === false) {
                clearStoredAuthSession();
                return { authenticated: false, reason: "account_disabled" };
            }
            return { authenticated: true, reason: null };
        }
        if (response.status === 404) {
            clearStoredAuthSession();
            return { authenticated: false, reason: "account_deleted" };
        }
        if (response.status === 401 || response.status === 403) {
            clearStoredAuthSession();
            return { authenticated: false, reason: "session_expired" };
        }
    } catch {
        // Network/temporary failures should not force logout on auth pages.
        return { authenticated: false, reason: null };
    }

    return { authenticated: false, reason: "session_expired" };
}

export async function redirectToDashboardIfAuthenticated() {
    const session = await validateStoredAccountSession();
    if (session.authenticated) {
        window.location.replace("/dashboard");
        return true;
    }
    return false;
}

export async function checkIsAuthenticated() {
    const session = await validateStoredAccountSession();
    return session.authenticated;
}

export async function ensureFullAccountSession() {
    const session = await validateStoredAccountSession();
    if (session.authenticated) {
        invalidateAuthSetupRequirementCache();
        const redirectedForTfa = await enforceAuthSetupIfRequired();
        return !redirectedForTfa;
    }
    const reason = session.reason
        ? `?reason=${encodeURIComponent(session.reason)}`
        : "";
    window.location.replace(`/login${reason}`);
    return false;
}

export function clearStoredAuthSession() {
    localStorage.removeItem("cognis_access_token");
    localStorage.removeItem("cognis_account");
    localStorage.removeItem("cognis_display_name");
    localStorage.removeItem("cognis_role");
    localStorage.removeItem("cognis_is_founder");
    localStorage.removeItem("cognis_user_validation_mode");
    document.cookie = "cognis_access_token=; Path=/; Max-Age=0";
}
