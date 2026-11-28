import { apiFetch } from "/static/reuse/api-client.js";
import { isOffline } from "/static/reuse/offline-state.js";
import {
    fetchProfileAvatarBlobUrl,
    getProfileInitials,
    getProfileInitialsColor,
} from "./profile-avatar.js";
import { canLoadOwnProfile } from "./session-policy.js";

export function createNavbarAvatarProvider(ctx) {
    const log = (...args) => ctx.capabilities.get("ui:log")?.(...args);
    return async () => {
        const handle = localStorage.getItem("cognis_account") ?? "";
        const storedDisplayName =
            localStorage.getItem("cognis_display_name") ?? handle;
        const fallbackFor = (label) => ({
            avatarInitials: getProfileInitials(label),
            avatarColor: getProfileInitialsColor(label),
        });
        let fallback = fallbackFor(storedDisplayName);
        if (!canLoadOwnProfile(ctx))
            return { ...fallback, profileAvailable: false };
        try {
            const pingResponse = isOffline()
                ? { ok: true }
                : await apiFetch("/api/v1/social/profile/ping");
            if (!pingResponse.ok)
                return { ...fallback, profileAvailable: false };
        } catch (error) {
            log("error", "profile_avatar_load_failed", {
                component: "social-profile",
                operation: "probeNavbarProfile",
                errorName: error?.name,
            });
            return { ...fallback, profileAvailable: false };
        }

        if (!canLoadOwnProfile(ctx))
            return { ...fallback, profileAvailable: false };
        try {
            const res = await apiFetch("/api/v1/social/profile");
            if (!res.ok) return { ...fallback, profileAvailable: true };
            const payload = await res.json();
            const profileLabel =
                payload?.data?.displayName ||
                payload?.data?.handle ||
                storedDisplayName;
            fallback = fallbackFor(profileLabel);
            const avatarKey = payload?.data?.avatarKey;
            if (!avatarKey) return { ...fallback, profileAvailable: true };

            const avatarBlobUrl = await fetchProfileAvatarBlobUrl(avatarKey);
            if (avatarBlobUrl)
                return { ...fallback, profileAvailable: true, avatarBlobUrl };
            return { ...fallback, profileAvailable: true };
        } catch (error) {
            log("error", "profile_avatar_load_failed", {
                component: "social-profile",
                operation: "loadNavbarProfile",
                errorName: error?.name,
            });
            return { ...fallback, profileAvailable: true };
        }
    };
}
