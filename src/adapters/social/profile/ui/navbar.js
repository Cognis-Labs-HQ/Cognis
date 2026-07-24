import { apiFetch } from "/static/reuse/api-client.js";
import { registerAvatarProvider } from "/static/layouts/dashboard-layout.js";
import { fetchProfileAvatarBlobUrl } from "/static/gateways/social/reuse/profile-avatar.js";
import { registerSearchIndexing } from "./search/index.js";

registerAvatarProvider(async function profileAvatarProvider() {
    try {
        const pingRes = await apiFetch("/api/v1/social/profile/ping");
        if (!pingRes.ok) return { profileAvailable: false };
    } catch {
        return { profileAvailable: false };
    }

    try {
        const res = await apiFetch("/api/v1/social/profile");
        if (!res.ok) return { profileAvailable: true };
        const payload = await res.json();
        const avatarKey = payload?.data?.avatarKey;
        if (!avatarKey) return { profileAvailable: true };

        const avatarBlobUrl = await fetchProfileAvatarBlobUrl(avatarKey);
        if (avatarBlobUrl) return { profileAvailable: true, avatarBlobUrl };
        return { profileAvailable: true };
    } catch {
        return { profileAvailable: true };
    }
});

registerSearchIndexing();
