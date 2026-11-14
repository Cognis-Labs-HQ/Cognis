import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadChatRoomKey, requireChatRoomKey } from "./chat-loading.js";
export { createMessagesI18n } from "./i18n.js";

const profileAvatars = () => {
    const capability = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!capability) throw new Error("Profile avatar capability unavailable");
    return capability;
};

export const handleProfileAvatarError = (event) =>
    profileAvatars().handleError(event);

export const hydrateProfileAvatars = (container) =>
    profileAvatars().hydrate(container);

export const getRoomKey = (roomId) => loadChatRoomKey(roomId);
export const requireRoomKey = (roomId) => requireChatRoomKey(roomId);

export const resolveThreadRoomKey = (roomContext, roomId) =>
    roomContext?.pendingRequest?.direction === "incoming" ||
    roomContext?.direction === "incoming"
        ? null
        : requireRoomKey(roomId);
