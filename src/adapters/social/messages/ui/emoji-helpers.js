let cachedEmojiList = null;
let cachedEmojiUsage = [];

export function getCachedEmojiList() {
    return cachedEmojiList ?? [];
}

export async function loadAllEmojis() {
    if (cachedEmojiList) return cachedEmojiList;
    try {
        const response = await fetch("/static/gateways/social/emojis.json");
        if (response.ok) {
            cachedEmojiList = await response.json();
        }
    } catch {
        // fall through to empty list below
    }
    cachedEmojiList = cachedEmojiList ?? [];
    return cachedEmojiList;
}

export async function fetchEmojiUsage(apiFetch) {
    try {
        const response = await apiFetch("/api/v1/messages/emoji-usage");
        if (!response.ok) {
            cachedEmojiUsage = [];
            return [];
        }
        const payload = await response.json();
        cachedEmojiUsage = Array.isArray(payload?.data) ? payload.data : [];
        return cachedEmojiUsage;
    } catch {
        cachedEmojiUsage = [];
        return [];
    }
}

export function recordEmojiUsage(apiFetch, emoji, normalizeReactionEmoji) {
    const normalized = normalizeReactionEmoji(emoji);
    if (!normalized) return;
    const existing = cachedEmojiUsage.find(
        (entry) => normalizeReactionEmoji(entry.emoji) === normalized,
    );
    if (existing) {
        existing.usageCount += 1;
    } else {
        cachedEmojiUsage.push({ emoji: normalized, usageCount: 1 });
    }
    cachedEmojiUsage.sort(
        (entryA, entryB) => entryB.usageCount - entryA.usageCount,
    );
    apiFetch("/api/v1/messages/emoji-usage", {
        method: "POST",
        body: JSON.stringify({ emoji: normalized }),
    }).catch(() => undefined);
}

export function getQuickReactionEmojis(normalizeReactionEmoji, count = 5) {
    const sortedByUsage = cachedEmojiUsage
        .map((entry) => normalizeReactionEmoji(entry.emoji))
        .filter(Boolean);
    const result = [];
    for (const emoji of sortedByUsage) {
        if (result.length >= count) break;
        if (!result.includes(emoji)) result.push(emoji);
    }
    for (const entry of cachedEmojiList ?? []) {
        if (result.length >= count) break;
        const normalized = normalizeReactionEmoji(entry.emoji);
        if (normalized && !result.includes(normalized)) result.push(normalized);
    }
    return result;
}
