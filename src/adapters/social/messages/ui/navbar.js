import { apiFetch } from "/static/reuse/api-client.js";
import { registerSearchIndex } from "/static/reuse/search-bar.js";
import { formatDate } from "/static/reuse/timestamp.js";
import { hexToBytes, importRoomKey } from "/static/reuse/crypto-utils.js";

const messagesLink = document.querySelector("[data-messages-link]");

async function syncMessagesLink() {
    if (!messagesLink) return;
    try {
        const response = await apiFetch("/api/v1/social/messages/ping");
        if (response.ok) {
            messagesLink.removeAttribute("hidden");
            return;
        }
    } catch {
        // Best-effort navbar contribution; keep the link hidden when probing fails.
    }
    messagesLink.setAttribute("hidden", "");
}

syncMessagesLink();
window.addEventListener("focus", syncMessagesLink);
window.addEventListener("cognis:navbar-refresh", syncMessagesLink);

const messagesSearchDecoder = new TextDecoder();
const messagesSearchRoomKeys = new Map();
const messagesSearchRoomMessages = new Map();

async function getSearchRoomKey(roomId) {
    if (messagesSearchRoomKeys.has(roomId))
        return messagesSearchRoomKeys.get(roomId);
    const response = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/key`,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const roomKeyHex = payload?.data?.key;
    if (typeof roomKeyHex !== "string" || roomKeyHex.length === 0) return null;
    const roomKey = await importRoomKey(roomKeyHex, ["decrypt"]);
    messagesSearchRoomKeys.set(roomId, roomKey);
    return roomKey;
}

async function decryptSearchMessage(roomKey, messageRecord) {
    if (!roomKey) return messageRecord.text || messageRecord.content || "";
    if (
        typeof messageRecord.iv !== "string" ||
        typeof messageRecord.ciphertext !== "string"
    ) {
        return messageRecord.text || messageRecord.content || "";
    }
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: hexToBytes(messageRecord.iv) },
            roomKey,
            hexToBytes(messageRecord.ciphertext),
        );
        return messagesSearchDecoder.decode(decrypted).trim();
    } catch {
        return "";
    }
}

function searchRoomLabel(room) {
    return (
        room.displayName ||
        room.name ||
        room.title ||
        room.participantDisplayName ||
        room.participantHandle ||
        room.id
    );
}

async function collectSearchRoomMessages(room) {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return [];
    if (messagesSearchRoomMessages.has(roomId)) {
        return messagesSearchRoomMessages.get(roomId);
    }
    const response = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
    );
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    const roomKey = await getSearchRoomKey(roomId);
    const records = await Promise.all(
        (payload?.data ?? []).map(async (messageRecord) => ({
            ...messageRecord,
            text: await decryptSearchMessage(roomKey, messageRecord),
        })),
    );
    messagesSearchRoomMessages.set(roomId, records);
    return records;
}

async function collectGlobalMessageSearchGroups() {
    const response = await apiFetch("/api/v1/social/messages/rooms");
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    const rooms = Array.isArray(payload?.data) ? payload.data : [];
    const items = (
        await Promise.all(
            rooms.map(async (room) => {
                const roomId = String(room?.id ?? "").trim();
                const roomLabel = searchRoomLabel(room);
                const records = await collectSearchRoomMessages(room);
                return records
                    .filter((messageRecord) =>
                        String(messageRecord.text ?? "").trim(),
                    )
                    .map((messageRecord) => {
                        const sender =
                            messageRecord.senderDisplayName ||
                            messageRecord.senderHandle ||
                            messageRecord.senderId ||
                            roomLabel;
                        const timeLabel = formatDate(
                            messageRecord.createdAt,
                            "",
                        );
                        return {
                            id: `message:${messageRecord.id}`,
                            label: sender,
                            description: [roomLabel, timeLabel]
                                .filter(Boolean)
                                .join(" — "),
                            url: `/messages/${encodeURIComponent(roomId)}#message-${encodeURIComponent(messageRecord.id)}`,
                            resultClass: "message",
                            searchText: [
                                roomLabel,
                                sender,
                                messageRecord.senderHandle,
                                messageRecord.text,
                                timeLabel,
                            ]
                                .filter(Boolean)
                                .join(" "),
                            visible: true,
                        };
                    });
            }),
        )
    ).flat();
    return items.length ? [{ category: "Messages", items }] : [];
}

registerSearchIndex("global-messages", collectGlobalMessageSearchGroups);
