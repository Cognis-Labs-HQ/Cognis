import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadChatRoomKey, requireChatRoomKey } from "./chat-loading.js";
import { createI18n } from "/static/reuse/i18n.js";

export const createMessagesI18n = () =>
    createI18n({
        componentStringBaseUrls: [
            "/static/adapters/social/messages/languages",
            "/static/gateways/social/languages",
        ],
    });

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
