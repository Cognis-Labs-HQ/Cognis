/**
 * Extracts the share token ID from a share-guest subject claim.
 *
 * @param {{ sub?: string } | undefined} claims
 * @returns {string}
 */
export function resolveShareGuestId(claims) {
    const subject = String(claims?.sub ?? "").trim();
    if (!subject.startsWith("share:")) return "";
    return subject.slice("share:".length).trim();
}

/**
 * Checks whether a share token's granted capabilities include a required scope.
 *
 * @param {{ grantedCapabilities?: string[] } | null | undefined} tokenRecord
 * @param {string} requiredCapability
 * @returns {boolean}
 */
export function hasShareCapability(tokenRecord, requiredCapability) {
    if (!requiredCapability) return true;
    const grantedCapabilities = Array.isArray(tokenRecord?.grantedCapabilities)
        ? tokenRecord.grantedCapabilities
        : [];
    return grantedCapabilities.includes(requiredCapability);
}
