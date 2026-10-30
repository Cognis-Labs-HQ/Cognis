import { createAdaptivePoller } from "/static/reuse/adaptive-poller.js";
import { profileFetch as apiFetch } from "./offline-client.js";
import { isOffline } from "/static/reuse/offline-state.js";

export async function loadSocialConnectionList(profileHandle, connectionKind) {
    const routeSegment =
        connectionKind === "followers" ? "follow" : connectionKind;
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(profileHandle)}/${routeSegment}`,
    );
    if (!response.ok) throw new Error(`Unable to refresh ${connectionKind}`);
    return (await response.json()).data ?? [];
}

const getSocialHandles = (users) =>
    users.map((user) => user?.handle ?? "").join("\n");

export function createFollowerCountPoller({
    loadConnections,
    readState,
    applyConnections,
    reportError,
}) {
    return createAdaptivePoller({
        task: async () => {
            if (isOffline()) return false;
            const { profileHandle, followers, following } = readState();
            if (!profileHandle) return false;
            const [latestFollowers, latestFollowing] = await Promise.all([
                loadConnections(profileHandle, "followers"),
                loadConnections(profileHandle, "following"),
            ]);
            const followersChanged =
                getSocialHandles(latestFollowers) !==
                getSocialHandles(followers);
            const followingChanged =
                getSocialHandles(latestFollowing) !==
                getSocialHandles(following);
            if (!followersChanged && !followingChanged) return false;
            applyConnections({
                followers: latestFollowers,
                following: latestFollowing,
                followersChanged,
                followingChanged,
            });
            return true;
        },
        minIntervalMs: 1_000,
        maxIntervalMs: 10_000,
        initialIntervalMs: 1_000,
        onError: reportError,
    });
}
