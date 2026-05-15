import {
    buildAuthorizationUrl,
    generateCodeChallenge,
    generateRandomString,
} from "./oauth-pkce.js";

/**
 * Shared LINE OAuth UI helpers used by authentication pages.
 *
 * Public exports:
 * - `openLineEmailDisclosurePopup(deps)` — opens the LINE disclosure popup and returns the selected action.
 * - `initiateLineOAuthRedirect(deps)` — starts the LINE OAuth redirect flow with PKCE.
 *
 * Usage example:
 * ```js
 * import {
 *   openLineEmailDisclosurePopup,
 *   initiateLineOAuthRedirect,
 * } from '../../reuse/line-oauth.js';
 *
 * const disclosureAction = await openLineEmailDisclosurePopup({
 *   i18n,
 *   openPopup,
 *   escapeHtml,
 * });
 * if (disclosureAction === 'confirm') {
 *   await initiateLineOAuthRedirect({ i18n, showToast });
 * }
 * ```
 */

/**
 * Opens the LINE data disclosure popup and returns the selected action id.
 *
 * @param {{ i18n: { t: (key: string) => string }, openPopup: Function, escapeHtml: (value: string) => string }} deps - UI dependencies.
 * @returns {Promise<string|null>} Selected action id (`confirm`/`cancel`) or null when dismissed.
 */
export async function openLineEmailDisclosurePopup({
    i18n,
    openPopup,
    escapeHtml,
}) {
    return openPopup({
        title: i18n.t("ui.app.login.line_disclosure.title"),
        body: `
      <p>${escapeHtml(i18n.t("ui.app.login.line_disclosure.body"))}</p>
      <p>${escapeHtml(i18n.t("ui.app.login.line_disclosure.body_followup"))}</p>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.app.login.line_disclosure.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.app.login.line_disclosure.cancel"),
                variant: "cancel",
            },
        ],
        variant: "warning",
        maxWidth: "560px",
    });
}

/**
 * Starts LINE OAuth by requesting init metadata, generating PKCE data, and redirecting the browser.
 *
 * @param {{ i18n: { t: (key: string) => string }, showToast: (message: string, options?: Record<string, unknown>) => void, fetchImpl?: typeof fetch, windowRef?: Window }} deps - Runtime dependencies and optional overrides.
 * @returns {Promise<boolean>} True when redirect has started, false when unavailable/error.
 */
export async function initiateLineOAuthRedirect({
    i18n,
    showToast,
    fetchImpl = fetch,
    windowRef = window,
}) {
    try {
        const initResponse = await fetchImpl("/api/v1/auth/line/init");
        if (!initResponse.ok) {
            showToast(i18n.t("ui.app.login.error.line_unavailable"), {
                variant: "error",
            });
            return false;
        }
        const initPayload = await initResponse.json();
        const lineInitData = initPayload.data;
        // Prefer backend-resolved callbackUrl for reverse-proxy/public-host deployments.
        // Fallback to managedRedirectPath + browser origin for backward compatibility.
        const redirectUri =
            String(lineInitData.callbackUrl ?? "").trim() ||
            new URL(
                lineInitData.managedRedirectPath,
                windowRef.location.origin,
            ).toString();
        const state = generateRandomString(32);
        windowRef.sessionStorage.setItem("line_oauth_state", state);
        let codeChallenge = "";
        let codeChallengeMethod = "";
        if (lineInitData.usePkce) {
            const codeVerifier = generateRandomString(64);
            codeChallenge = await generateCodeChallenge(codeVerifier);
            codeChallengeMethod = "S256";
            windowRef.sessionStorage.setItem(
                "line_code_verifier",
                codeVerifier,
            );
        }
        windowRef.location.href = buildAuthorizationUrl({
            endpoint: lineInitData.authorizationEndpoint,
            clientId: lineInitData.channelId,
            redirectUri,
            state,
            scope: lineInitData.scope,
            codeChallenge,
            codeChallengeMethod,
        });
        return true;
    } catch {
        showToast(i18n.t("ui.app.login.error.line_unavailable"), {
            variant: "error",
        });
        return false;
    }
}
