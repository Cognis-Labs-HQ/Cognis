/**
 * Reports a login-page failure without contacting authenticated services.
 *
 * Login pages are available before authentication, while the browser logging
 * endpoint requires an authenticated session. Sending anonymous failures to
 * that endpoint would create a second HTTP 401 error and obscure the failure
 * that the login UI is trying to present.
 *
 * @param {Record<string, unknown>} meta - Structured failure metadata.
 * @returns {void}
 */
export function reportLoginError(meta) {
    console.error(meta);
}
