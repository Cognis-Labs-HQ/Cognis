import { apiFetch } from "/static/reuse/api-client.js";
import { registerAvatarProvider } from "/static/layouts/dashboard-layout.js";
import { applyStaticTranslations, createI18n } from "/static/reuse/i18n.js";
import { fetchProfileAvatarBlobUrl } from "./profile-avatar.js";
import { registerSearchIndexing } from "./search/index.js";
import {
    availabilityIndicatorMarkup,
    fetchAvailability,
    setManualAvailability,
    STATUS_OPTIONS,
} from "./availability.js";

const availabilityStylesheet = document.createElement("link");
availabilityStylesheet.rel = "stylesheet";
availabilityStylesheet.href =
    "/static/adapters/social/profile/availability.css";
document.head.append(availabilityStylesheet);

async function mountAvailabilityControl() {
    const button = document.querySelector(".avatar-button");
    const dropdown = document.querySelector("#profile-dropdown");
    if (!button || !dropdown) return;

    if (!button.querySelector(".availability-indicator")) {
        button.insertAdjacentHTML("beforeend", availabilityIndicatorMarkup(""));
    }
    const indicator = button.querySelector(".availability-indicator");
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    const statusItem = document.createElement("li");
    statusItem.className = "availability-menu-item";
    statusItem.innerHTML = `
        <label class="availability-menu-label" for="availability-status">
            <span data-i18n="ui.reuse.status"></span>:
            <select id="availability-status" class="availability-menu-select">
                ${STATUS_OPTIONS.map(
                    (status) =>
                        `<option value="${status}" data-i18n="ui.app.profile.availability.${status}"></option>`,
                ).join("")}
            </select>
        </label>`;
    dropdown.prepend(statusItem);
    applyStaticTranslations(i18n, statusItem);

    const select = statusItem.querySelector("#availability-status");
    const availability = await fetchAvailability();
    const status = availability?.status ?? "free";
    select.value = status;
    updateAvailabilityIndicator(indicator, status, i18n);

    select.addEventListener("change", async () => {
        const selectedStatus = select.value;
        if (await setManualAvailability(selectedStatus)) {
            const updatedAvailability = await fetchAvailability();
            const resolvedStatus =
                updatedAvailability?.status ?? selectedStatus;
            select.value = resolvedStatus;
            updateAvailabilityIndicator(indicator, resolvedStatus, i18n);
        }
    });
}

function updateAvailabilityIndicator(indicator, status, i18n) {
    const label = i18n.t(`ui.app.profile.availability.${status}`);
    indicator.dataset.availabilityStatus = status;
    indicator.title = label;
    indicator.setAttribute("aria-label", label);
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
