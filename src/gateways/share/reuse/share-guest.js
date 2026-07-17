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

/**
 * Resolves a share-guest claim against a resource and capability without
 * exposing share token or guest-profile internals to consumers.
 *
 * @param {object} options
 * @param {{ sub?: string } | undefined} options.claims
 * @param {string} options.resourceType
 * @param {string} options.resourceId
 * @param {string} [options.requiredCapability]
 * @param {(id: string) => Promise<object|null>} options.getTokenById
 * @param {(id: string) => Promise<object|null>} [options.getGuestProfile]
 * @returns {Promise<{ shareGuest: boolean, authorized: boolean, username?: string, displayName?: string }>}
 */
export async function resolveShareGuestAccess({
    claims,
    resourceType,
    resourceId,
    requiredCapability = "",
    getTokenById,
    getGuestProfile,
} = {}) {
    const shareId = resolveShareGuestId(claims);
    if (!shareId) return { shareGuest: false, authorized: false };
    if (typeof getTokenById !== "function") {
        return { shareGuest: true, authorized: false };
    }
    const token = await getTokenById(shareId);
    const authorized = Boolean(
        token?.resourceType === resourceType &&
        token?.resourceId === resourceId &&
        hasShareCapability(token, requiredCapability),
    );
    if (!authorized) return { shareGuest: true, authorized: false };
    const guestSessionId = resolveShareGuestSessionId(claims);
    const guestProfile =
        guestSessionId && typeof getGuestProfile === "function"
            ? await getGuestProfile(guestSessionId).catch(() => null)
            : null;
    const displayName = String(guestProfile?.displayName ?? "").trim();
    return {
        shareGuest: true,
        authorized: true,
        username: `guest:${guestSessionId || shareId}`,
        displayName: displayName || `Guest ${guestSessionId || shareId}`,
    };
}
