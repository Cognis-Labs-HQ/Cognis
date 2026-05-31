/**
 * Participant identifier normalization helpers for calendar popup search.
 *
 * Exports:
 * - normalizeUserIdentifier(entry): returns normalized username/handle token.
 * - isUserMatchByIdentifier(user, identifier): checks identifier equality.
 *
 * Example:
 * const isMatch = isUserMatchByIdentifier(userEntry, "alice");
 */
/**
 * Builds a normalized lookup token for a user search result entry.
 *
 * @param {Record<string, unknown>} entry
 * @returns {string}
 */
export function normalizeUserIdentifier(entry) {
    const accountId = String(entry?.accountId ?? "").trim();
    const username = String(entry?.username ?? accountId ?? "").trim();
    const id = String(entry?.id ?? "").trim();
    return String(username || accountId || id)
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
}

/**
 * Compares a user object against a normalized identifier candidate.
 *
 * @param {Record<string, unknown>} user
 * @param {string} identifier
 * @returns {boolean}
 */
export function isUserMatchByIdentifier(user, identifier) {
    const normalizedIdentifier = String(identifier ?? "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
    if (!normalizedIdentifier) return false;
    const normalizedUserIdentifier = normalizeUserIdentifier(user);
    const normalizedHandle = String(user?.handle ?? "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
    return (
        normalizedUserIdentifier === normalizedIdentifier ||
        normalizedHandle === normalizedIdentifier
    );
}
