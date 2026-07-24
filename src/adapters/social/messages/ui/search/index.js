import { apiFetch } from "/static/reuse/api-client.js";
import { hexToBytes, importRoomKey } from "/static/reuse/crypto-utils.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { formatDate } from "/static/reuse/timestamp.js";

export const componentSearchId = "social-messages";

const messagesSearchDecoder = new TextDecoder();
const messagesSearchRoomKeys = new Map();
const messagesSearchRoomMessages = new Map();
const MESSAGE_SEARCH_PAGE_SIZE = 100;

async function getSearchRoomKey(roomId) {
    if (messagesSearchRoomKeys.has(roomId)) {
        return messagesSearchRoomKeys.get(roomId);
    }
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
    } catch (error) {
        if (error?.name !== "OperationError") {
            console.warn("[messages-search]:decrypt-failed", {
                messageId: messageRecord.id,
                error,
            });
        }
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

function isOpaqueRoomLabel(label) {
    return /^[a-f0-9-]{20,}$/i.test(String(label ?? ""));
}

function messageSearchContext(roomLabel, sender) {
    const normalizedRoomLabel = String(roomLabel ?? "").trim();
    if (!normalizedRoomLabel || normalizedRoomLabel === sender) return "";
    return isOpaqueRoomLabel(normalizedRoomLabel) ? "" : normalizedRoomLabel;
}

function createChatSearchItem(room) {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return null;
    const roomLabel = searchRoomLabel(room);
    if (!String(roomLabel ?? "").trim() || isOpaqueRoomLabel(roomLabel)) {
        return null;
    }
    return {
        id: `chat:${roomId}`,
        label: roomLabel,
        description: "Chat",
        url: `/messages/${encodeURIComponent(roomId)}`,
        resultClass: "chat",
        category: "Chats",
        searchText: roomLabel,
        showMatchSnippet: false,
        visible: true,
    };
}

async function collectSearchRoomMessages(room) {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return [];
    if (messagesSearchRoomMessages.has(roomId)) {
        return messagesSearchRoomMessages.get(roomId);
    }
    const records = [];
    let before = "";
    while (true) {
        const params = new URLSearchParams({
            limit: String(MESSAGE_SEARCH_PAGE_SIZE),
        });
        if (before) params.set("before", before);
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
        );
        if (!response.ok) return [];
        const payload = await response.json().catch(() => null);
        const pageRecords = Array.isArray(payload?.data) ? payload.data : [];
        records.push(...pageRecords);
        if (pageRecords.length < MESSAGE_SEARCH_PAGE_SIZE) break;
        before = String(pageRecords.at(-1)?.createdAt ?? "");
        if (!before) break;
    }
    const roomKey = await getSearchRoomKey(roomId);
    const decodedRecords = await Promise.all(
        records.map(async (messageRecord) => ({
            ...messageRecord,
            text: await decryptSearchMessage(roomKey, messageRecord),
        })),
    );
    messagesSearchRoomMessages.set(roomId, decodedRecords);
    return decodedRecords;
}

export async function buildSearchResults({ query = "" } = {}) {
    const response = await apiFetch("/api/v1/social/messages/rooms");
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    const rooms = Array.isArray(payload?.data) ? payload.data : [];
    const chatItems = rooms.map(createChatSearchItem).filter(Boolean);
    const messageItems = (
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
                        const context = messageSearchContext(roomLabel, sender);
                        return {
                            id: `message:${messageRecord.id}`,
                            label: sender,
                            description: [context, timeLabel]
                                .filter(Boolean)
                                .join(" — "),
                            url: `/messages/${encodeURIComponent(roomId)}#message-${encodeURIComponent(messageRecord.id)}`,
                            resultClass: "message",
                            category: "Messages",
                            searchText: [sender, messageRecord.text]
                                .filter(Boolean)
                                .join(" "),
                            visible: true,
                        };
                    });
            }),
        )
    ).flat();
    return [
        chatItems.length ? { category: "Chats", items: chatItems } : null,
        messageItems.length
            ? { category: "Messages", items: messageItems }
            : null,
    ].filter(Boolean);
}

export function registerSearchIndexing() {
    return registerSearchIndex("global-messages", buildSearchResults, {
        componentId: componentSearchId,
    });
}
