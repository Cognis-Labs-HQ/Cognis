/**
 * Auth-session helpers for the Cognis browser shell.
 *
 * All session-validation logic lives in the `authenticate-session` flow
 * registered by `src/gateways/auth/ui/session-flow-hooks.js`. These helpers
 * are thin callers that run the flow and act on its result so that pages and
 * the SPA router share a single, extension-friendly auth path.
 *
 * Public exports:
 * - redirectToDashboardIfAuthenticated() — validates the session and redirects
 *   to `/dashboard` when valid. Returns true when the redirect was issued.
 * - checkIsAuthenticated() — validates the session without redirecting.
 *   Returns true when authenticated.
 * - ensureFullAccountSession() — enforces a full authenticated session with
 *   setup-requirement checks. Redirects to login or /settings#security when
 *   enforcement is needed. Returns true only when the caller may proceed.
 * - getShareContext() — returns the current share context from the last
 *   session result, or null outside a share page.
 * - clearStoredAuthSession() — removes all locally stored auth tokens and
 *   profile data.
 *
 * Usage:
 *   import '/static/reuse/page-flow-catalog.js';
 *   import { ensureFullAccountSession } from '/static/reuse/auth-session.js';
 *   const ok = await ensureFullAccountSession();
 */

import "/static/reuse/page-flow-catalog.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

let lastShareContext = null;

function getSessionResult(flowResult) {
    return (flowResult?.stageResults?.["resolve-session"] ?? [])[0] ?? null;
}

export async function redirectToDashboardIfAuthenticated() {
    const flowResult = await uiCtx.runFlow("authenticate-session", {});
    const session = getSessionResult(flowResult);
    if (session?.authenticated) {
        window.location.replace("/dashboard");
        return true;
    }
    return false;
}

export async function checkIsAuthenticated() {
    const flowResult = await uiCtx.runFlow("authenticate-session", {});
    const session = getSessionResult(flowResult);
    return session?.authenticated === true;
}

export async function ensureFullAccountSession() {
    const flowResult = await uiCtx.runFlow("authenticate-session", {});
    const session = getSessionResult(flowResult);
    lastShareContext = session?.shareContext ?? null;
    if (session?.requiresRedirect && session.redirectTo) {
        window.location.replace(session.redirectTo);
        return false;
    }
    return session?.authenticated === true;
}

export function getShareContext() {
    return lastShareContext;
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
