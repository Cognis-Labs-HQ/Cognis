import { normalizeHandleKey } from "../../../../api/reuse/normalize-handle.js";

function matchesParticipantQuery(profile, query) {
    if (!query) return true;
    const handle = normalizeHandleKey(profile?.handle ?? "");
    const displayName = String(profile?.displayName ?? "")
        .trim()
        .toLowerCase();
    return handle.startsWith(query) || displayName.startsWith(query);
}

function toParticipantSummary(profile) {
    return {
        username: profile.handle,
        handle: profile.handle,
        displayName: profile.displayName ?? profile.handle,
        avatarKey: profile.avatarKey ?? null,
    };
}

export async function listEligibleMeetingParticipantProfiles(
    profileStore,
    requesterAccountId,
    query = "",
    { limit = 50, includeHidden = false, candidateUsernames = null } = {},
) {
    const normalizedQuery = normalizeHandleKey(query).replace(/^@/, "");
    const candidateSet = Array.isArray(candidateUsernames)
        ? new Set(
              candidateUsernames.map((username) =>
                  normalizeHandleKey(username),
              ),
          )
        : null;
    const followedProfiles =
        await profileStore.getFollowing(requesterAccountId);
    const results = [];
    const seen = new Set();
    for (const profile of followedProfiles) {
        const handle = normalizeHandleKey(profile?.handle ?? "");
        if (
            !profile?.accountId ||
            !handle ||
            profile.accountId === requesterAccountId
        ) {
            continue;
        }
        if (candidateSet && !candidateSet.has(handle)) {
            continue;
        }
        if (!includeHidden && profile.visibility === "hidden") {
            continue;
        }
        if (
            await profileStore.isBlocked(profile.accountId, requesterAccountId)
        ) {
            continue;
        }
        if (!matchesParticipantQuery(profile, normalizedQuery)) {
            continue;
        }
        if (seen.has(profile.accountId)) {
            continue;
        }
        seen.add(profile.accountId);
        results.push(profile);
        if (results.length >= limit) break;
    }
    return results;
}

export async function listEligibleMeetingParticipantSummaries(
    profileStore,
    requesterAccountId,
    candidateUsernames,
) {
    const profiles = await listEligibleMeetingParticipantProfiles(
        profileStore,
        requesterAccountId,
        "",
        {
            candidateUsernames,
            includeHidden: false,
            limit: Array.isArray(candidateUsernames)
                ? candidateUsernames.length
                : 0,
        },
    );
    return profiles.map(toParticipantSummary);
}
