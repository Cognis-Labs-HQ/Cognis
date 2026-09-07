import { apiFetch } from "/static/reuse/api-client.js";

export const messagesUiClient = Object.freeze({
    listRoomMessages(roomId, options = {}) {
        return apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
            options,
        );
    },
    openPrivateRoom(payload, options = {}) {
        return apiFetch("/api/v1/social/messages/rooms", {
            ...options,
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
    },
    sendRoomMessage(roomId, input) {
        const { accessToken, suppressAccessDeniedEvent, ...payload } = input;
        return apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                accessToken,
                suppressAccessDeniedEvent,
            },
        );
    },
});
