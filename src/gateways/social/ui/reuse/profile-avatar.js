import { uiCtx } from "/static/reuse/ui-ctx.js";

function profileAvatarRenderer() {
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!renderer) {
        throw new Error("The profile avatar UI capability is unavailable");
    }
    return renderer;
}

export const buildProfileAvatarMarkup = (options) =>
    profileAvatarRenderer().buildMarkup(options);
export const fetchProfileAvatarBlobUrl = (avatarKey) =>
    profileAvatarRenderer().fetch(avatarKey);
export const handleProfileAvatarError = (event) =>
    profileAvatarRenderer().handleError(event);
export const hydrateProfileAvatars = (container) =>
    profileAvatarRenderer().hydrate(container);
export const isProfileAvatarUnavailable = (avatarKey) =>
    profileAvatarRenderer().isUnavailable(avatarKey);
