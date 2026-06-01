import {
    buildProfileAvatarMarkup,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";

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
                const avatarKey = String(
                    matchedUser?.avatarKey ?? matchedUser?.avatar ?? "",
                ).trim();
                participantDirectory.set(identifier, {
                    username,
                    displayName,
                    avatarKey,
                });
            } catch {
                // best-effort participant enrichment
            }
        }),
    );
    return participantDirectory;
}

/**
 * Renders a single participant mini-card HTML string.
 *
 * @param {{ type: string, value: string | null | undefined, label: string | null | undefined }} entry
 * @param {{ escapeHtml: Function, i18n: object, participantKey: Function }} opts
 * @returns {string}
 */
export function buildParticipantCardHtml(
    entry,
    { escapeHtml, i18n, participantKey, removable = true },
) {
    const key = escapeHtml(participantKey(entry));
    const removeLabel = escapeHtml(
        i18n.t("gateway.calendar.remove_participant"),
    );
    const removeButton = removable
        ? `<button type="button" class="calendar-participant-card-remove" data-participant-remove="${key}" aria-label="${removeLabel}">×</button>`
        : "";
    if (entry.type === "user") {
        const handle = String(entry.value ?? "").trim();
        const displayName = String(entry.label ?? handle).trim();
        const avatarMarkup = buildProfileAvatarMarkup({
            avatarKey:
                typeof entry.avatarKey === "string" && entry.avatarKey.trim()
                    ? entry.avatarKey.trim()
                    : null,
            label: displayName || handle,
            colorSeed: handle,
            avatarClass: "calendar-participant-card-avatar-profile",
            imageClass: "calendar-participant-card-avatar-image",
            fallbackClass: "calendar-participant-card-avatar-fallback",
            profileHandle: null,
        });
        return `<div class="calendar-participant-card"><a href="/profile/${escapeHtml(handle)}" class="calendar-participant-card-profile"><span class="calendar-participant-card-avatar">${avatarMarkup}</span><span class="calendar-participant-card-meta"><span class="calendar-participant-card-name">${escapeHtml(displayName)}</span><span class="calendar-participant-card-handle">@${escapeHtml(handle)}</span></span></a>${removeButton}</div>`;
    }
    const email = String(entry.value ?? "").trim();
    const displayLabel = String(entry.label ?? email).trim();
    const avatarMarkup = buildProfileAvatarMarkup({
        avatarKey: null,
        label: displayLabel || email,
        colorSeed: email,
        avatarClass: "calendar-participant-card-avatar-profile",
        imageClass: "calendar-participant-card-avatar-image",
        fallbackClass: "calendar-participant-card-avatar-fallback",
        profileHandle: null,
    });
    return `<div class="calendar-participant-card"><div class="calendar-participant-card-profile"><span class="calendar-participant-card-avatar">${avatarMarkup}</span><span class="calendar-participant-card-meta"><span class="calendar-participant-card-name">${escapeHtml(displayLabel)}</span></span></div>${removeButton}</div>`;
}

export { hydrateProfileAvatars };
