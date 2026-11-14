import { uiCtx } from "../reuse/ui-ctx.js";

/**
 * Refreshes the navbar avatar through the optional profile-owned CTX provider.
 * Keeps unchanged avatar nodes mounted and ignores superseded provider results.
 */
let avatarRefreshSequence = 0;
const displayedAvatars = new WeakMap();
let avatarSubscription = null;

export async function updateNavbarAvatar() {
    const refreshSequence = ++avatarRefreshSequence;
    const avatarBtn = document.querySelector(".avatar-button");
    const profileLink = document.querySelector("[data-profile-link]");
    if (avatarSubscription?.button !== avatarBtn) {
        if (avatarSubscription)
            displayedAvatars.delete(avatarSubscription.button);
        avatarSubscription?.stopWatching();
        avatarSubscription = null;
    }
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

    const previous = displayedAvatars.get(avatarBtn);
    const sameIdentity =
        previous?.handle === handle &&
        previous?.accessToken === accessToken &&
        previous?.provider === avatarProvider;
    let stopWatching = previous?.stopWatching;
    if (!sameIdentity) {
        stopWatching?.();
        avatarBtn.querySelector(".avatar-image")?.remove();
        displayedAvatars.delete(avatarBtn);
        const signal = avatarProvider?.signal;
        const removed = () => {
            stopWatching?.();
            if (!avatarBtn.isConnected) return;
            renderAvatarFallback(avatarBtn, "?", null, availabilityIndicator);
            profileLink?.closest("li")?.toggleAttribute("hidden", true);
            displayedAvatars.delete(avatarBtn);
        };
        if (!signal?.aborted)
            signal?.addEventListener("abort", removed, { once: true });
        stopWatching = () => {
            signal?.removeEventListener("abort", removed);
            if (avatarSubscription?.stopWatching === stopWatching)
                avatarSubscription = null;
        };
        avatarSubscription = { button: avatarBtn, stopWatching };
        displayedAvatars.set(avatarBtn, {
            handle,
            accessToken,
            provider: avatarProvider,
            stopWatching,
        });
    }
    let avatarState;
    let avatarKey;
    let onAvatarError;
    if (avatarProvider) {
        try {
            const result = await avatarProvider();
            avatarState = result?.avatarState;
            avatarKey = result?.avatarKey;
            onAvatarError = result?.onAvatarError;
            profileAvailable = result?.profileAvailable ?? false;
            avatarBlobUrl =
                avatarState === "available" &&
                typeof result?.avatarBlobUrl === "string"
                    ? result.avatarBlobUrl
                    : null;
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
    ) {
        if (!avatarBtn.isConnected) stopWatching?.();
        return;
    }

    if (
        avatarState === "retryable" &&
        sameIdentity &&
        (!avatarKey || avatarKey === previous?.key) &&
        avatarBtn.querySelector(".avatar-image")
    )
        return;

    if (profileLink) {
        profileLink.closest("li")?.toggleAttribute("hidden", !profileAvailable);
    }

    displayedAvatars.set(avatarBtn, {
        handle,
        accessToken,
        provider: avatarProvider,
        key: avatarKey,
        stopWatching,
    });
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
        img.addEventListener(
            "error",
            () => {
                if (
                    avatarBtn.querySelector(".avatar-image") !== img ||
                    handle !== (localStorage.getItem("cognis_account") ?? "") ||
                    accessToken !==
                        localStorage.getItem("cognis_access_token") ||
                    avatarProvider !==
                        uiCtx.capabilities.get("ui:navbarAvatarProvider")
                )
                    return;
                onAvatarError?.();
                renderAvatarFallback(
                    avatarBtn,
                    avatarInitials,
                    avatarColor,
                    availabilityIndicator,
                );
            },
            { once: true },
        );
        avatarBtn.replaceChildren(img);
        if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
        return;
    }

    renderAvatarFallback(
        avatarBtn,
        avatarInitials,
        avatarColor,
        availabilityIndicator,
    );
}

function renderAvatarFallback(
    avatarBtn,
    avatarInitials,
    avatarColor,
    availabilityIndicator,
) {
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
