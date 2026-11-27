import { bindCapability } from "../reuse/capabilities.js";

import { uiCtx } from "../reuse/ui-ctx.js";

const log = bindCapability("ui:log");

/**
 * Refreshes the navbar avatar through the optional profile-owned CTX provider.
 * Keeps unchanged avatar nodes mounted and ignores superseded provider results.
 */
let avatarRefreshSequence = 0;

export async function updateNavbarAvatar() {
    const refreshSequence = ++avatarRefreshSequence;
    const avatarButton = document.querySelector(".avatar-button");
    const profileLink = document.querySelector("[data-profile-link]");
    if (!avatarButton) return;
    const handle = localStorage.getItem("cognis_account") ?? "";
    const accessToken = localStorage.getItem("cognis_access_token");

    const availabilityIndicator = avatarButton.querySelector(
        ".availability-indicator",
    );

    let profileAvailable = false;
    let avatarBlobUrl = null;
    let avatarInitials = "?";
    let avatarColor = null;
    const avatarProvider = uiCtx.capabilities.get("ui:navbarAvatarProvider");

    if (avatarProvider) {
        try {
            const result = await avatarProvider();
            profileAvailable = result?.profileAvailable ?? false;
            avatarBlobUrl = result?.avatarBlobUrl ?? null;
            avatarInitials = result?.avatarInitials ?? avatarInitials;
            avatarColor = result?.avatarColor ?? avatarColor;
        } catch (error) {
            void log("error", "[dashboard-layout]:avatar-provider-failed", {
                error,
            });
            profileAvailable = false;
        }
    }

    if (
        refreshSequence !== avatarRefreshSequence ||
        !avatarButton.isConnected ||
        handle !== (localStorage.getItem("cognis_account") ?? "") ||
        accessToken !== localStorage.getItem("cognis_access_token") ||
        avatarProvider !== uiCtx.capabilities.get("ui:navbarAvatarProvider")
    )
        return;

    if (profileLink) {
        profileLink.closest("li")?.toggleAttribute("hidden", !profileAvailable);
    }

    if (avatarBlobUrl) {
        if (
            avatarButton.querySelector(".avatar-image")?.getAttribute("src") ===
            avatarBlobUrl
        )
            return;
        const image = document.createElement("img");
        image.className = "avatar-image";
        image.alt = "";
        image.src = avatarBlobUrl;
        avatarButton.replaceChildren(image);
        if (availabilityIndicator) avatarButton.append(availabilityIndicator);
        return;
    }

    const existingInitials = avatarButton.querySelector(".avatar-initials");
    if (existingInitials?.textContent === avatarInitials) {
        existingInitials.style.background = avatarColor ?? "";
        return;
    }
    const initialsElement = document.createElement("span");
    initialsElement.className = "avatar-initials";
    initialsElement.textContent = avatarInitials;
    if (avatarColor) initialsElement.style.background = avatarColor;
    avatarButton.replaceChildren(initialsElement);
    if (availabilityIndicator) avatarButton.append(availabilityIndicator);
}
