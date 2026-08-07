import { apiFetch } from "/static/reuse/api-client.js";
import { registerAvatarProvider } from "/static/layouts/dashboard-layout.js";
import { fetchProfileAvatarBlobUrl } from "./profile-avatar.js";
import { registerSearchIndexing } from "./search/index.js";
import {
    availabilityIndicatorMarkup,
    fetchAvailability,
    setManualAvailability,
    STATUS_OPTIONS,
} from "./availability.js";

async function mountAvailabilityControl() {
    const button = document.querySelector(".avatar-button");
    if (!button || button.querySelector(".availability-indicator")) return;
    button.insertAdjacentHTML("beforeend", availabilityIndicatorMarkup(""));
    const indicator = button.querySelector(".availability-indicator");
    const availability = await fetchAvailability();
    if (availability?.status) {
        indicator.dataset.availabilityStatus = availability.status;
    }
    indicator.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const currentIndex = STATUS_OPTIONS.indexOf(
            indicator.dataset.availabilityStatus,
        );
        const nextStatus =
            STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length];
        if (await setManualAvailability(nextStatus)) {
            const updatedAvailability = await fetchAvailability();
            indicator.dataset.availabilityStatus =
                updatedAvailability?.status ?? nextStatus;
        }
    });
}

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
mountAvailabilityControl();
