import { apiFetch } from "/static/reuse/api-client.js";
import { createAnchoredPopup, openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";

const MAX_EMOJI_PICKER_DISPLAY_COUNT = 80;

async function loadAllEmojis(cache) {
    if (cache.emojiList) return cache.emojiList;
    try {
        const response = await fetch("/static/gateways/social/emojis.json");
        if (response.ok) {
            cache.emojiList = await response.json();
        }
    } catch {
        cache.emojiList = cache.emojiList ?? [];
    }
    cache.emojiList = cache.emojiList ?? [];
    return cache.emojiList;
}

function stableJson(value) {
    return JSON.stringify(value);
}

export function normalizeReactionEmoji(emoji) {
    return String(emoji ?? "")
        .trim()
        .replace(/[\uFE0E\uFE0F]/g, "")
        .normalize("NFC");
}

function emojiDisplayName(emoji, i18n, cache) {
    const normalizedEmoji = normalizeReactionEmoji(emoji);
    let matchingEntry = null;
    for (const entry of cache.emojiList ?? []) {
        if (normalizeReactionEmoji(entry.emoji) === normalizedEmoji) {
            matchingEntry = entry;
            break;
        }
    }
    if (!matchingEntry) return emoji;
    return i18n?.t(matchingEntry.name) ?? emoji;
}

/**
 * Builds a reusable message-reactions controller used by Messages and Meetings
 * chat surfaces. The controller renders reaction rows, handles hover popups,
 * loads emoji usage data, opens the emoji picker popup, and toggles reactions.
 *
 * @param {{
 *   i18n: { t: (key: string) => string },
 *   maxEmojiDisplayCount?: number,
 *   onReactionUpdated?: (input: { roomId: string, messageId: string, emoji: string }) => Promise<void> | void
 * }} [options]
 * @returns {{
 *   destroy: () => void,
 *   hideReactionHoverPopup: () => void,
 *   loadEmojiUsage: () => Promise<Array<{ emoji: string, usageCount: number }>>,
 *   openEmojiPickerPopup: (roomId: string, messageId: string) => Promise<void>,
 *   recordEmojiUsage: (emoji: string) => void,
 *   renderReactionRow: (message: { id?: string, reactions?: Array<unknown> }) => string,
 *   repositionReactionHoverPopup: () => void,
 *   showReactionHoverPopup: (button: HTMLButtonElement) => void,
 *   toggleReaction: (roomId: string, messageId: string, emoji: string) => Promise<void>
 * }}
 */
export function createMessageReactionsController({
    i18n,
    maxEmojiDisplayCount = MAX_EMOJI_PICKER_DISPLAY_COUNT,
    onReactionUpdated,
} = {}) {
    const stateCache = {
        emojiList: null,
        emojiUsage: [],
    };
    const reactionHoverPopup = createAnchoredPopup({
        className: "messages-reaction-hover-popup",
    });

    function hideReactionHoverPopup() {
        reactionHoverPopup.hide();
    }

    function showReactionHoverPopup(reactionChipButton) {
        if (!(reactionChipButton instanceof HTMLButtonElement)) return;
        const emojiName = String(
            reactionChipButton.getAttribute("data-reaction-emoji-name") ?? "",
        ).trim();
        if (!emojiName) {
            hideReactionHoverPopup();
            return;
        }
        const rawReactedBy = String(
            reactionChipButton.getAttribute("data-reacted-by") ?? "[]",
        );
        let reactedByLabels = [];
        try {
            const parsedReactedBy = JSON.parse(rawReactedBy);
            reactedByLabels = Array.isArray(parsedReactedBy)
                ? parsedReactedBy
                      .map((label) => String(label ?? "").trim())
                      .filter(Boolean)
                : [];
        } catch {
            reactedByLabels = [];
        }
        const participantsMarkup =
            reactedByLabels.length > 0
                ? `<ul class="messages-reaction-hover-popup-users">${reactedByLabels
                      .map(
                          (participantLabel) =>
                              `<li class="messages-reaction-hover-popup-user">${escapeHtml(participantLabel)}</li>`,
                      )
                      .join("")}</ul>`
                : "";
        reactionHoverPopup.show(
            reactionChipButton,
            `<h3 class="messages-reaction-hover-popup-title">${escapeHtml(emojiName)}</h3>${participantsMarkup}`,
        );
    }

    function repositionReactionHoverPopup() {
        reactionHoverPopup.reposition();
    }

    function destroy() {
        reactionHoverPopup.destroy();
    }

    async function loadEmojiUsage() {
        try {
            const response = await apiFetch("/api/v1/messages/emoji-usage");
            if (!response.ok) {
                stateCache.emojiUsage = [];
                return [];
            }
            const payload = await response.json();
            stateCache.emojiUsage = Array.isArray(payload?.data)
                ? payload.data
                : [];
            return stateCache.emojiUsage;
        } catch {
            stateCache.emojiUsage = [];
            return [];
        }
    }

    function recordEmojiUsage(emoji) {
        const normalizedEmoji = normalizeReactionEmoji(emoji);
        if (!normalizedEmoji) return;
        const usageEntry = stateCache.emojiUsage.find(
            (entry) => normalizeReactionEmoji(entry.emoji) === normalizedEmoji,
        );
        if (usageEntry) {
            usageEntry.usageCount += 1;
        } else {
            stateCache.emojiUsage.push({
                emoji: normalizedEmoji,
                usageCount: 1,
            });
        }
        stateCache.emojiUsage.sort(
            (left, right) => right.usageCount - left.usageCount,
        );
        apiFetch("/api/v1/messages/emoji-usage", {
            method: "POST",
            body: JSON.stringify({ emoji: normalizedEmoji }),
        }).catch(() => undefined);
    }

    function getQuickReactionEmojis() {
        const sortedByUsage = stateCache.emojiUsage
            .map((entry) => normalizeReactionEmoji(entry.emoji))
            .filter(Boolean);
        const result = [];
        for (const emoji of sortedByUsage) {
            if (result.length >= 5) break;
            if (!result.includes(emoji)) {
                result.push(emoji);
            }
        }
        for (const entry of stateCache.emojiList ?? []) {
            if (result.length >= 5) break;
            const normalizedEmoji = normalizeReactionEmoji(entry.emoji);
            if (normalizedEmoji && !result.includes(normalizedEmoji)) {
                result.push(normalizedEmoji);
            }
        }
        return result;
    }

    function renderReactionRows(message) {
        if (!message?.id) return "";
        const reactionEntries = Array.isArray(message.reactions)
            ? message.reactions
            : [];
        const mergedByEmoji = new Map();
        for (const reaction of reactionEntries) {
            const normalizedEmoji = normalizeReactionEmoji(reaction.emoji);
            if (!normalizedEmoji) continue;
            const existing = mergedByEmoji.get(normalizedEmoji);
            if (existing) {
                existing.count += Number(reaction.count ?? 0);
                existing.reactedByMe =
                    existing.reactedByMe || reaction.reactedByMe;
                const reactedByRows = Array.isArray(reaction.reactedBy)
                    ? reaction.reactedBy
                    : [];
                for (const reactor of reactedByRows) {
                    if (
                        existing.reactedBy.some(
                            (entry) => entry.accountId === reactor.accountId,
                        )
                    ) {
                        continue;
                    }
                    existing.reactedBy.push(reactor);
                }
                continue;
            }
            mergedByEmoji.set(normalizedEmoji, {
                emoji: normalizedEmoji,
                count: Number(reaction.count ?? 0),
                reactedByMe: Boolean(reaction.reactedByMe),
                reactedBy: Array.isArray(reaction.reactedBy)
                    ? reaction.reactedBy
                    : [],
            });
        }
        const hasChips = mergedByEmoji.size > 0;
        const chips = Array.from(mergedByEmoji.values())
            .map((reaction) => {
                const ownClass = reaction.reactedByMe
                    ? " messages-reaction-chip--active"
                    : "";
                const resolvedEmojiName = emojiDisplayName(
                    reaction.emoji,
                    i18n,
                    stateCache,
                );
                const reactedByLabels = reaction.reactedBy
                    .map((reactor) => resolveMemberDisplayName(reactor))
                    .filter(Boolean);
                const reactedByPayload = stableJson(reactedByLabels);
                return `<button type="button" class="messages-reaction-chip${ownClass}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(reaction.emoji)}" data-reaction-emoji-name="${escapeHtml(resolvedEmojiName)}" data-reacted-by="${escapeHtml(reactedByPayload)}">${escapeHtml(reaction.emoji)} <span>${escapeHtml(String(reaction.count))}</span></button>`;
            })
            .join("");
        const quick = Array.from(new Set(getQuickReactionEmojis()))
            .filter(
                (emoji) =>
                    emoji && !mergedByEmoji.has(normalizeReactionEmoji(emoji)),
            )
            .map(
                (emoji) =>
                    `<button type="button" class="messages-reaction-add-btn" title="${escapeHtml(emojiDisplayName(emoji, i18n, stateCache))}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`,
            )
            .join("");
        const moreLabel = i18n?.t("module.social.messages.emoji_more") ?? "···";
        const moreButton = `<button type="button" class="messages-reaction-more-btn" title="${escapeHtml(moreLabel)}" data-message-id="${escapeHtml(message.id)}" data-reaction-more="1">···</button>`;
        const activeRowClass = hasChips
            ? "messages-reactions-row messages-reactions-row--has-active"
            : "messages-reactions-row";
        const activeClass = hasChips
            ? "messages-reactions-active messages-reactions-active--has-chips"
            : "messages-reactions-active";
        return `<div class="messages-reaction-picker-row"><span class="messages-reactions-available">${quick}${moreButton}</span></div><div class="${activeRowClass}"><span class="${activeClass}">${chips}</span></div>`;
    }

    async function toggleReaction(roomId, messageId, emoji) {
        if (!roomId || !messageId || !emoji) return;
        const normalizedEmoji = normalizeReactionEmoji(emoji);
        if (!normalizedEmoji) return;
        const response = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
            {
                method: "POST",
                body: JSON.stringify({ emoji: normalizedEmoji }),
            },
        );
        if (!response.ok) return;
        await onReactionUpdated?.({
            roomId,
            messageId,
            emoji: normalizedEmoji,
        });
    }

    async function openEmojiPickerPopup(roomId, messageId) {
        if (!roomId || !messageId) return;
        const allEmojis = await loadAllEmojis(stateCache);
        const pickerPlaceholder = i18n.t(
            "module.social.messages.emoji_search_placeholder",
        );
        const pickerTitle = i18n.t("module.social.messages.emoji_more");

        function buildEmojiGridHtml(entries) {
            return entries
                .slice(0, maxEmojiDisplayCount)
                .map((entry) => {
                    const resolvedName = i18n.t(entry.name) ?? entry.name;
                    return `<button type="button" class="messages-emoji-picker-btn" data-emoji="${escapeHtml(entry.emoji)}" title="${escapeHtml(resolvedName)}">${escapeHtml(entry.emoji)}</button>`;
                })
                .join("");
        }

        await openPopup({
            title: pickerTitle,
            maxWidth: "420px",
            body: `<div class="messages-emoji-picker"><input type="text" class="messages-emoji-search" placeholder="${escapeHtml(pickerPlaceholder)}" autocomplete="off" /><div class="messages-emoji-grid">${buildEmojiGridHtml(allEmojis)}</div></div>`,
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                const searchInput = overlay.querySelector(
                    ".messages-emoji-search",
                );
                const grid = overlay.querySelector(".messages-emoji-grid");
                grid?.addEventListener("click", async (clickEvent) => {
                    const emojiButton = clickEvent.target.closest(
                        ".messages-emoji-picker-btn",
                    );
                    if (!(emojiButton instanceof HTMLButtonElement)) return;
                    const chosenEmoji = emojiButton.dataset.emoji;
                    if (!chosenEmoji) return;
                    overlay.querySelector("[data-popup-action]")?.click();
                    recordEmojiUsage(chosenEmoji);
                    await toggleReaction(roomId, messageId, chosenEmoji);
                });
                searchInput?.addEventListener("input", () => {
                    const query = searchInput.value
                        .normalize("NFC")
                        .toLowerCase()
                        .trim();
                    const filtered = query
                        ? allEmojis.filter((entry) => {
                              const resolvedName = (
                                  i18n.t(entry.name) ?? entry.name
                              )
                                  .normalize("NFC")
                                  .toLowerCase();
                              return resolvedName.includes(query);
                          })
                        : allEmojis;
                    if (grid) {
                        grid.innerHTML = buildEmojiGridHtml(filtered);
                    }
                });
                searchInput?.focus();
            },
        });
    }

    return {
        destroy,
        hideReactionHoverPopup,
        loadEmojiUsage,
        openEmojiPickerPopup,
        recordEmojiUsage,
        renderReactionRow: renderReactionRows,
        repositionReactionHoverPopup,
        showReactionHoverPopup,
        toggleReaction,
    };
}
