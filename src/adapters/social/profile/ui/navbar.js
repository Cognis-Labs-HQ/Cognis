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
    const menuTemplateResponse = await fetch(
        "/static/adapters/social/profile/availability-menu.html",
    );
    statusItem.innerHTML = await menuTemplateResponse.text();
    dropdown.prepend(statusItem);
    applyStaticTranslations(i18n, statusItem);

    const statusToggle = statusItem.querySelector(".availability-menu-toggle");
    const statusOptions = statusItem.querySelector(
        ".availability-menu-options",
    );
    const optionTemplate = statusOptions.querySelector(
        "[data-availability-option-template]",
    );
    for (const status of STATUS_OPTIONS) {
        const fragment = optionTemplate.content.cloneNode(true);
        const option = fragment.querySelector(".availability-menu-option");
        option.dataset.availabilityOption = status;
        option.querySelector(
            ".availability-menu-dot",
        ).dataset.availabilityStatus = status;
        option.querySelector("[data-availability-label]").textContent = i18n.t(
            `ui.app.profile.availability.${status}`,
        );
        statusOptions.append(fragment);
    }
    optionTemplate.remove();
    const availability = await fetchAvailability();
    updateAvailabilitySelection(
        statusItem,
        indicator,
        availability?.status ?? "free",
        i18n,
    );

    statusToggle.addEventListener("click", () => {
        const shouldOpen = statusOptions.hidden;
        statusOptions.hidden = !shouldOpen;
        statusToggle.setAttribute("aria-expanded", String(shouldOpen));
    });

    statusItem
        .querySelectorAll("[data-availability-option]")
        .forEach((option) => {
            option.addEventListener("click", async () => {
                const selectedStatus = option.dataset.availabilityOption;
                if (await setManualAvailability(selectedStatus)) {
                    const updatedAvailability = await fetchAvailability();
                    updateAvailabilitySelection(
                        statusItem,
                        indicator,
                        updatedAvailability?.status ?? selectedStatus,
                        i18n,
                    );
                    statusOptions.hidden = true;
                    statusToggle.setAttribute("aria-expanded", "false");
                }
            });
        });
}

function updateAvailabilitySelection(container, indicator, status, i18n) {
    const label = i18n.t(`ui.app.profile.availability.${status}`);
    const value = container.querySelector(".availability-menu-value");
    const currentDot = container.querySelector(
        ".availability-menu-toggle .availability-menu-dot",
    );
    value.textContent = label;
    currentDot.dataset.availabilityStatus = status;
    container
        .querySelectorAll("[data-availability-option]")
        .forEach((option) => {
            option.setAttribute(
                "aria-selected",
                String(option.dataset.availabilityOption === status),
            );
        });
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
