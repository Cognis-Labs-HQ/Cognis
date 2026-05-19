/**
 * Trusted-domain utilities for UI-side email and link validation.
 *
 * Public exports:
 *   normalizeTrustedDomains(entries) — normalizes persisted trusted-domain entries.
 *   matchesTrustedDomain(candidateDomain, trustedDomains) — checks whether a hostname or email domain is trusted.
 *   isTrustedHttpUrl(urlValue, options) — validates same-origin or trusted-domain HTTP(S) URLs.
 *   loadTrustedDomains(apiFetch, options) — loads and caches trusted domains from system security settings.
 *   clearTrustedDomainsCache() — clears the cached trusted-domain list.
 *
 * Usage:
 *   const trustedDomains = await loadTrustedDomains(apiFetch);
 *   if (isTrustedHttpUrl('/docs', { baseUrl: window.location.origin, trustedDomains })) {
 *     // safe to navigate
 *   }
 *
 * @module ui-reuse/trusted-domains
 */

let trustedDomainsPromise = null;

/**
 * @param {unknown} entries
 * @returns {string[]}
 */
export function normalizeTrustedDomains(entries) {
    if (!Array.isArray(entries)) return [];
    return Array.from(
        new Set(
            entries
                .filter((entry) => typeof entry === "string")
                .map((entry) =>
                    entry
                        .trim()
                        .toLowerCase()
                        .replace(/^\.+|\.+$/g, ""),
                )
                .filter(Boolean),
        ),
    );
}

/**
 * @param {string} candidateDomain
 * @param {string[]} trustedDomains
 * @returns {boolean}
 */
export function matchesTrustedDomain(candidateDomain, trustedDomains) {
    const normalizedCandidate = String(candidateDomain ?? "")
        .trim()
        .toLowerCase()
        .replace(/^\.+|\.+$/g, "");
    if (!normalizedCandidate) return false;
    return normalizeTrustedDomains(trustedDomains).some(
        (trustedDomain) =>
            normalizedCandidate === trustedDomain ||
            normalizedCandidate.endsWith(`.${trustedDomain}`),
    );
}

/**
 * @param {string} urlValue
 * @param {{ baseUrl?: string, trustedDomains?: string[] }} [options]
 * @returns {boolean}
 */
export function isTrustedHttpUrl(
    urlValue,
    {
        baseUrl = typeof window === "undefined"
            ? "http://localhost"
            : window.location.origin,
        trustedDomains = [],
    } = {},
) {
    if (!urlValue) return true;
    try {
        const parsedBaseUrl = new URL(baseUrl);
        const parsedUrl = new URL(urlValue, parsedBaseUrl);
        const hasSafeProtocol =
            parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        if (!hasSafeProtocol || parsedUrl.username || parsedUrl.password) {
            return false;
        }
        if (parsedUrl.origin === parsedBaseUrl.origin) {
            return true;
        }
        return matchesTrustedDomain(parsedUrl.hostname, trustedDomains);
    } catch {
        return false;
    }
}

/**
 * @param {Function} apiFetch
 * @param {{ forceReload?: boolean }} [options]
 * @returns {Promise<string[]>}
 */
export async function loadTrustedDomains(
    apiFetch,
    { forceReload = false } = {},
) {
    if (forceReload || trustedDomainsPromise === null) {
        trustedDomainsPromise = (async () => {
            try {
                const response = await apiFetch("/api/v1/system/security");
                if (!response.ok) return [];
                const payload = await response.json().catch(() => null);
                return normalizeTrustedDomains(payload?.data?.trustedDomains);
            } catch {
                return [];
            }
        })();
    }
    return trustedDomainsPromise;
}

/**
 * @returns {void}
 */
export function clearTrustedDomainsCache() {
    trustedDomainsPromise = null;
}
