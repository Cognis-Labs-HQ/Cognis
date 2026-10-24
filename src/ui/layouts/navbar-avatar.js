import { uiCtx } from "../reuse/ui-ctx.js";

/**
 * Refreshes the navbar avatar through the optional profile-owned CTX provider.
 * Keeps unchanged avatar nodes mounted and ignores superseded provider results.
 */
let avatarRefreshSequence = 0;

export async function updateNavbarAvatar() {
    const refreshSequence = ++avatarRefreshSequence;
    const avatarBtn = document.querySelector(".avatar-button");
    const profileLink = document.querySelector("[data-profile-link]");
    if (!avatarBtn) return;
    const handle = localStorage.getItem("cognis_account") ?? "";
    const accessToken = localStorage.getItem("cognis_access_token");

    const availabilityIndicator = avatarBtn.querySelector(
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
            console.error("[dashboard-layout]:avatar-provider-failed", {
                error,
            });
            profileAvailable = false;
        }
    }

    if (
        refreshSequence !== avatarRefreshSequence ||
        !avatarBtn.isConnected ||
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
            avatarBtn.querySelector(".avatar-image")?.getAttribute("src") ===
            avatarBlobUrl
        )
            return;
        const img = document.createElement("img");
        img.className = "avatar-image";
        img.alt = "";
        img.src = avatarBlobUrl;
        avatarBtn.replaceChildren(img);
        if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
        return;
    }

    const existingInitials = avatarBtn.querySelector(".avatar-initials");
    if (existingInitials?.textContent === avatarInitials) {
        existingInitials.style.background = avatarColor ?? "";
        return;
    }
    const initialsEl = document.createElement("span");
    initialsEl.className = "avatar-initials";
    initialsEl.textContent = avatarInitials;
    if (avatarColor) initialsEl.style.background = avatarColor;
    avatarBtn.replaceChildren(initialsEl);
    if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
}
