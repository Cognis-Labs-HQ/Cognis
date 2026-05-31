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

export async function createParticipantDirectory(apiFetch, identifiers) {
    const normalizedIdentifiers = Array.from(
        new Set(
            (Array.isArray(identifiers) ? identifiers : [])
                .map((entry) => String(entry ?? "").trim())
                .filter(Boolean),
        ),
    );
    const participantDirectory = new Map();
    await Promise.all(
        normalizedIdentifiers.map(async (identifier) => {
            try {
                const response = await apiFetch(
                    `/api/v1/search?type=users&q=${encodeURIComponent(identifier)}`,
                );
                if (!response.ok) return;
                const payload = await response.json();
                const users = Array.isArray(payload?.data) ? payload.data : [];
                const matchedUser = users.find((entry) =>
                    isUserMatchByIdentifier(entry, identifier),
                );
                if (!matchedUser) return;
                const username =
                    normalizeUserIdentifier(matchedUser) || identifier;
                const displayName = String(
                    matchedUser?.displayName ?? matchedUser?.label ?? "",
                ).trim();
                participantDirectory.set(identifier, {
                    username,
                    displayName,
                });
            } catch {
                // best-effort participant enrichment
            }
        }),
    );
    return participantDirectory;
}
