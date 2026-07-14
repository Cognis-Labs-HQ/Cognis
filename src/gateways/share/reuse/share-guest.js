/**
 * Extracts the share token ID from a share-guest subject claim. Guest
 * subjects are encoded as `share:<shareId>` or `share:<shareId>:<guestId>`.
 *
 * @param {{ sub?: string } | undefined} claims
 * @returns {string}
 */
export function resolveShareGuestId(claims) {
    const subject = String(claims?.sub ?? "").trim();
    if (!subject.startsWith("share:")) return "";
    const remainder = subject.slice("share:".length).trim();
    const separatorIndex = remainder.indexOf(":");
    return separatorIndex === -1
        ? remainder
        : remainder.slice(0, separatorIndex);
}

/**
 * Extracts the per-session guest ID from a share-guest subject claim, used to
 * resolve a guest's temporary display profile. Returns "" when the claim
 * predates guest-profile support and carries no guest ID segment.
 *
 * @param {{ sub?: string } | undefined} claims
 * @returns {string}
 */
export function resolveShareGuestSessionId(claims) {
    const subject = String(claims?.sub ?? "").trim();
    if (!subject.startsWith("share:")) return "";
    const remainder = subject.slice("share:".length).trim();
    const separatorIndex = remainder.indexOf(":");
    if (separatorIndex === -1) return "";
    return remainder.slice(separatorIndex + 1).trim();
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
