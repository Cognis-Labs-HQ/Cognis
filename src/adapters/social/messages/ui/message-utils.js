import { normalizeMessageStyle } from "/static/reuse/message-style-options.js";
import { bytesToHex, hexToBytes } from "/static/reuse/crypto-utils.js";
import { getCachedEmojiList } from "./emoji-helpers.js";

const TEXT_ENCODER = new TextEncoder();

export function resolveMessageStyle() {
    const rootStyle = document.documentElement.dataset.messageStyle;
    if (rootStyle) return normalizeMessageStyle(rootStyle);
    try {
        const raw = localStorage.getItem("cognis_ui_preferences");
        if (!raw) return normalizeMessageStyle(null);
        const parsed = JSON.parse(raw);
        return normalizeMessageStyle(parsed?.messageStyle);
    } catch {
        return normalizeMessageStyle(null);
    }
}

export function formatHandleNotation(handle) {
    return `@${handle}`;
}

export function normalizeReactionEmoji(emoji) {
    return String(emoji ?? "")
        .trim()
        .replace(/[\uFE0E\uFE0F]/g, "")
        .normalize("NFC");
}

export function emojiDisplayName(emoji, i18n) {
    const normalized = normalizeReactionEmoji(emoji);
    let entry = null;
    for (const item of getCachedEmojiList()) {
        if (normalizeReactionEmoji(item.emoji) === normalized) {
            entry = item;
            break;
        }
    }
    if (!entry) return emoji;
    return i18n?.t(entry.name) ?? emoji;
}

export async function encryptMessage(key, plaintext) {
    const initVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initVector },
        key,
        TEXT_ENCODER.encode(plaintext),
    );
    return {
        iv: bytesToHex(initVector),
        ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    };
}

export async function decryptMessageOrReturnPlaintext(key, message) {
    try {
        if (message.contentType === "application/vnd.cognis.room-event+json") {
            return message.ciphertext;
        }
        if (!message.iv) return null;
        let cipherHex = message.ciphertext;
        if (message.authTag) {
            cipherHex = `${cipherHex}${message.authTag}`;
        }
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: hexToBytes(message.iv) },
            key,
            hexToBytes(cipherHex),
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

export function stableJson(value) {
    return JSON.stringify(value);
}

/**
 * Extracts the room ID from a messages chat URL of the form `/messages/{roomId}`.
 *
 * @param {string | null | undefined} chatUrl - Chat URL to parse.
 * @returns {string} The decoded room ID, or an empty string when not found.
 */
export function extractRoomId(chatUrl) {
    const raw = String(chatUrl ?? "").trim();
    if (!raw) return "";
    const match = raw.match(/^\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}
