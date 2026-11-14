import { uiCtx } from "../reuse/ui-ctx.js";

/** Places provider-owned content without changing the navbar button or menu. */
let avatarRefreshSequence = 0;
const displayedAvatars = new WeakMap();
let avatarSubscription = null;

function showUnavailable(avatarBtn, availabilityIndicator) {
    const placeholder = document.createElement("span");
    placeholder.className = "avatar-initials";
    placeholder.textContent = "?";
    avatarBtn.replaceChildren(placeholder);
    if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
}

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
    const avatarProvider = uiCtx.capabilities.get("ui:navbarAvatarProvider");
    const availabilityIndicator = avatarBtn.querySelector(
        ".availability-indicator",
    );
    const previous = displayedAvatars.get(avatarBtn);
    const sameIdentity =
        previous?.handle === handle &&
        previous?.accessToken === accessToken &&
        previous?.provider === avatarProvider;
    let stopWatching = previous?.stopWatching;
    if (!sameIdentity) {
        stopWatching?.();
        showUnavailable(avatarBtn, availabilityIndicator);
        displayedAvatars.delete(avatarBtn);
        const signal = avatarProvider?.signal;
        const removed = () => {
            stopWatching?.();
            if (!avatarBtn.isConnected) return;
            showUnavailable(avatarBtn, availabilityIndicator);
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
    let result;
    if (avatarProvider) {
        try {
            result = await avatarProvider();
            if (
                typeof result?.renderContent !== "function" ||
                ![
                    "available",
                    "missing",
                    "denied",
                    "retryable",
                    "invalid",
                    "stale",
                ].includes(result.avatarState)
            )
                throw new Error("navbar_avatar_content_unavailable");
        } catch (error) {
            console.error("[dashboard-layout]:avatar-provider-failed", {
                error,
            });
            result = null;
        }
    }
    const isCurrent = () =>
        refreshSequence === avatarRefreshSequence &&
        avatarBtn.isConnected &&
        handle === (localStorage.getItem("cognis_account") ?? "") &&
        accessToken === localStorage.getItem("cognis_access_token") &&
        avatarProvider === uiCtx.capabilities.get("ui:navbarAvatarProvider") &&
        !avatarProvider?.signal?.aborted;
    if (!isCurrent()) {
        if (!avatarBtn.isConnected) stopWatching?.();
        return;
    }
    const retainImage =
        result?.avatarState === "retryable" &&
        sameIdentity &&
        (!result.avatarKey || result.avatarKey === previous?.key);
    let content;
    try {
        content = result?.renderContent(
            sameIdentity ? previous?.content : null,
            { retainImage },
        );
        if (
            content &&
            (content.nodeType !== 1 || content.ownerDocument !== document)
        )
            throw new Error("navbar_avatar_content_invalid");
    } catch (error) {
        console.error("[dashboard-layout]:avatar-content-failed", { error });
        content = null;
    }
    if (!isCurrent()) {
        if (!avatarBtn.isConnected) stopWatching?.();
        return;
    }
    profileLink
        ?.closest("li")
        ?.toggleAttribute("hidden", !content || !result.profileAvailable);
    if (content) {
        avatarBtn.replaceChildren(content);
        if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
    } else showUnavailable(avatarBtn, availabilityIndicator);
    displayedAvatars.set(avatarBtn, {
        handle,
        accessToken,
        provider: avatarProvider,
        key: retainImage ? previous?.key : result?.avatarKey,
        content,
        stopWatching,
    });
}
