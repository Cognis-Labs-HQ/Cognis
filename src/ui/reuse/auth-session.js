/**
 * Auth-session helpers for public auth pages.
 *
 * Public exports:
 * - redirectToDashboardIfAuthenticated() — validates the stored API token and
 *   redirects to `/dashboard` only when still valid; clears stale auth storage
 *   when invalid.
 *
 * Usage:
 *   const redirected = await redirectToDashboardIfAuthenticated();
 *   if (redirected) await new Promise(() => {});
 *
 * @returns {Promise<boolean>}
 */
export async function redirectToDashboardIfAuthenticated() {
    const token = localStorage.getItem("cognis_token");
    if (!token) return false;

    try {
        const response = await fetch("/api/v1/ui/navbar-plugins", {
            headers: { authorization: `Bearer ${token}` },
        });
        if (response.ok) {
            window.location.replace("/dashboard");
            return true;
        }
        if (response.status === 401 || response.status === 403) {
            clearStoredAuthSession();
        }
    } catch {
        // Network/temporary failures should not force logout on auth pages.
    }

    return false;
}

function clearStoredAuthSession() {
    localStorage.removeItem("cognis_token");
    localStorage.removeItem("cognis_account");
    localStorage.removeItem("cognis_display_name");
    localStorage.removeItem("cognis_role");
    localStorage.removeItem("cognis_is_founder");
    document.cookie = "cognis_token=; Path=/; Max-Age=0";
}
