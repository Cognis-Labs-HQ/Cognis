/**
 * Browser-side OAuth 2.0 PKCE helpers.
 *
 * Exports:
 * - `generateRandomString(length)` — cryptographically random URL-safe string
 * - `generateCodeChallenge(codeVerifier)` — S256 PKCE code challenge
 * - `buildAuthorizationUrl(params)` — constructs a full OAuth authorization URL
 *
 * Usage:
 * ```js
 * import { generateRandomString, generateCodeChallenge, buildAuthorizationUrl } from '../reuse/oauth-pkce.js';
 * const codeVerifier = generateRandomString(64);
 * const codeChallenge = await generateCodeChallenge(codeVerifier);
 * const url = buildAuthorizationUrl({
 *   endpoint: 'https://example.com/oauth2/authorize',
 *   clientId: 'my-client',
 *   redirectUri: 'https://myapp.example.com/callback',
 *   state: generateRandomString(32),
 *   scope: 'openid profile email',
 *   codeChallenge,
 *   codeChallengeMethod: 'S256',
 * });
 * window.location.href = url;
 * ```
 */

/**
 * Generates a cryptographically random URL-safe string of the given length.
 *
 * @param {number} length - Number of characters to generate.
 * @returns {string} URL-safe random string.
 */
export function generateRandomString(length) {
    const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
        "",
    );
}

/**
 * Derives a PKCE S256 code challenge from a code verifier.
 *
 * @param {string} codeVerifier - Plaintext PKCE code verifier.
 * @returns {Promise<string>} Base64URL-encoded SHA-256 hash of the verifier.
 */
export async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

/**
 * Constructs an OAuth 2.0 authorization URL from the provided parameters.
 *
 * @param {object} params
 * @param {string} params.endpoint - Authorization endpoint URL.
 * @param {string} params.clientId - OAuth client ID.
 * @param {string} params.redirectUri - Registered redirect URI.
 * @param {string} params.state - Random state value for CSRF protection.
 * @param {string} params.scope - Space-separated OAuth scopes.
 * @param {string} [params.codeChallenge] - PKCE code challenge (omit if not using PKCE).
 * @param {string} [params.codeChallengeMethod] - PKCE method, typically 'S256'.
 * @returns {string} The fully-qualified authorization URL.
 */
export function buildAuthorizationUrl({
    endpoint,
    clientId,
    redirectUri,
    state,
    scope,
    codeChallenge,
    codeChallengeMethod,
}) {
    const query = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope,
    });
    if (codeChallenge && codeChallengeMethod) {
        query.set("code_challenge", codeChallenge);
        query.set("code_challenge_method", codeChallengeMethod);
    }
    return `${endpoint}?${query}`;
}
