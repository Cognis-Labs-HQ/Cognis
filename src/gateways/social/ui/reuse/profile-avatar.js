import { uiCtx } from "/static/reuse/ui-ctx.js";

function getRenderer() {
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!renderer) {
        throw new Error("The profile avatar capability is unavailable.");
    }
    return renderer;
}

export const buildProfileAvatarMarkup = (parameters) =>
    getRenderer().buildMarkup(parameters);
export const fetchProfileAvatarBlobUrl = (avatarKey) =>
    getRenderer().fetchBlobUrl(avatarKey);
export const getInitialsText = (label) => getRenderer().getInitialsText(label);
export const handleProfileAvatarError = (event) =>
    getRenderer().handleError(event);
export const hydrateProfileAvatars = (container) =>
    getRenderer().hydrate(container);
export const isProfileAvatarUnavailable = (avatarKey) =>
    getRenderer().isUnavailable(avatarKey);
export const pickInitialsColor = (seed) =>
    getRenderer().pickInitialsColor(seed);
