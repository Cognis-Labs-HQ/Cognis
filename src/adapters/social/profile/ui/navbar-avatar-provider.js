import { apiFetch } from "/static/reuse/api-client.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { profileReadState } from "./reuse/avatar-cache.js";
import {
    getAvatarContext,
    evictProfileAvatarImage,
    getProfileInitials,
    getProfileInitialsColor,
    invalidateProfileAvatar,
    readProfileAvatar,
} from "./profile-avatar.js";

export function createNavbarAvatarProvider(scope) {
    let lastContext;
    let lastKey;
    let readSequence = 0;
    const provider = async () => {
        const sequence = ++readSequence;
        const context = getAvatarContext();
        const isCurrent = () =>
            sequence === readSequence &&
            context === getAvatarContext() &&
            !scope.signal.aborted;
        const label =
            localStorage.getItem("cognis_display_name") ??
            localStorage.getItem("cognis_account") ??
            "";
        const fallbackFor = (value) => ({
            avatarInitials: getProfileInitials(value),
            avatarColor: getProfileInitialsColor(value),
        });
        let fallback = fallbackFor(label);
        const result = (avatarState, profileAvailable, extra = {}) => ({
            ...fallback,
            avatarState,
            profileAvailable,
            ...extra,
        });
        if (!context || scope.signal.aborted) return result("stale", false);
        if (lastContext !== context) {
            lastKey = null;
            lastContext = context;
        }
        try {
            const ping = isOffline()
                ? { ok: true }
                : await apiFetch("/api/v1/social/profile/ping", {
                      signal: scope.signal,
                  });
            if (!isCurrent()) return result("stale", false);
            if (!ping.ok) {
                const state = profileReadState(ping);
                if (state !== "retryable") invalidateProfileAvatar();
                return result(state, false);
            }
            const response = await apiFetch("/api/v1/social/profile", {
                signal: scope.signal,
            });
            if (!isCurrent()) return result("stale", false);
            if (!response.ok) {
                const state = profileReadState(response);
                if (state !== "retryable") invalidateProfileAvatar();
                return result(state, state === "retryable");
            }
            const payload = await response.json();
            if (!isCurrent()) return result("stale", false);
            const profile = payload?.data;
            if (
                !profile ||
                typeof profile !== "object" ||
                !Object.hasOwn(profile, "avatarKey")
            )
                return result("invalid", false);
            const profileLabel = profile.displayName || profile.handle || label;
            fallback = fallbackFor(profileLabel);
            const avatarKey = profile.avatarKey;
            if (lastKey && lastKey !== avatarKey)
                invalidateProfileAvatar(lastKey);
            lastKey = avatarKey;
            if (!avatarKey) return result("missing", true);
            const avatar = await readProfileAvatar(avatarKey);
            return result(avatar.state, true, {
                avatarKey,
                avatarBlobUrl: avatar.blobUrl,
                onAvatarError: () => {
                    if (context === getAvatarContext() && !scope.signal.aborted)
                        evictProfileAvatarImage(avatarKey, avatar.blobUrl);
                },
            });
        } catch (error) {
            const log = scope.capabilities.get("ui:log");
            if (!scope.signal.aborted)
                log?.("error", "Profile navbar read failed.", {
                    component: "social-profile",
                    operation: "readNavbarAvatar",
                    errorName: error?.name,
                });
            return result(scope.signal.aborted ? "stale" : "retryable", false);
        }
    };
    provider.signal = scope.signal;
    return provider;
}
