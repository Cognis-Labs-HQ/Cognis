import { apiFetch } from "/static/reuse/api-client.js";
import {
    registerAvatarProvider,
    updateNavbarAvatar,
} from "/static/layouts/dashboard-layout.js";
import { fetchProfileAvatarBlobUrl } from "/static/adapters/social/profile/profile-avatar.js";
import { registerSearchIndexing } from "./search/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

let currentAvailabilityOverride = null;

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
        const availability = payload?.data?.availability ?? "available";
        currentAvailabilityOverride =
            payload?.data?.availabilityOverride ?? null;
        if (!avatarKey) return { profileAvailable: true, availability };

        const avatarBlobUrl = await fetchProfileAvatarBlobUrl(avatarKey);
        if (avatarBlobUrl)
            return { profileAvailable: true, avatarBlobUrl, availability };
        return { profileAvailable: true, availability };
    } catch {
        return { profileAvailable: true };
    }
});

window.addEventListener("cognis:availability-override-request", async () => {
    const i18n = await createI18n();
    const action = await openPopup({
        title: i18n.t("ui.reuse.availability"),
        body: i18n.t("ui.reuse.availability_override_description"),
        actions: ["available", "busy", "tentative", "automatic"].map(
            (status) => ({
                id: status,
                label: i18n.t(`ui.reuse.availability_${status}`),
                variant:
                    (status === "automatic" ? null : status) ===
                    currentAvailabilityOverride
                        ? "confirm"
                        : "neutral",
            }),
        ),
    });
    if (!action) return;
    const response = await apiFetch("/api/v1/social/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            availabilityOverride: action === "automatic" ? null : action,
        }),
    });
    if (!response.ok) {
        showToast(i18n.t("ui.reuse.error"), { variant: "error" });
        return;
    }
    window.dispatchEvent(new CustomEvent("cognis:navbar-refresh"));
    await updateNavbarAvatar();
});

setInterval(() => {
    updateNavbarAvatar().catch((error) => {
        console.warn("[social-profile]:availability-refresh-failed", error);
    });
}, 30_000);

registerSearchIndexing();
