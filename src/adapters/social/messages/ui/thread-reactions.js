import { escapeHtml } from "/static/reuse/escape-html.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";
import { getQuickReactionEmojis } from "./emoji-helpers.js";
import {
    normalizeReactionEmoji,
    emojiDisplayName,
    stableJson,
} from "./message-utils.js";
import { patchThreadContent, updateThreadView } from "./thread-dom.js";
import { setMessageReactionState } from "./reuse/reaction-record.js";

const MAX_VISIBLE_REACTION_CHIPS = 5;

export function renderReactionRows(message, i18n, isOwn = false) {
    if (!message?.id) {
        return {
            pickerRow: "",
            activeRow: "",
        };
    }
    const reactionRows = Array.isArray(message.reactions)
        ? message.reactions
        : [];
    const mergedByEmoji = new Map();
    for (const reaction of reactionRows) {
        const normalizedEmoji = normalizeReactionEmoji(reaction.emoji);
        if (!normalizedEmoji) continue;
        const existing = mergedByEmoji.get(normalizedEmoji);
        if (existing) {
            existing.count += Number(reaction.count ?? 0);
            existing.reactedByMe = existing.reactedByMe || reaction.reactedByMe;
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
    const allReactions = Array.from(mergedByEmoji.values());
    const visibleReactions =
        allReactions.length > 0
            ? allReactions.slice(0, MAX_VISIBLE_REACTION_CHIPS)
            : [];
    const hiddenReactionCount = Math.max(
        0,
        allReactions.length - visibleReactions.length,
    );
    const chips = visibleReactions
        .map((reaction) => {
            const ownClass = reaction.reactedByMe
                ? " messages-reaction-chip--active"
                : "";
            const emojiName = emojiDisplayName(reaction.emoji, i18n);
            const reactedByLabels = reaction.reactedBy
                .map((reactor) => resolveMemberDisplayName(reactor))
                .filter(Boolean);
            const reactedByPayload = stableJson(reactedByLabels);
            return `<button type="button" class="messages-reaction-chip${ownClass}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(reaction.emoji)}" data-reaction-emoji-name="${escapeHtml(emojiName)}" data-reacted-by="${escapeHtml(reactedByPayload)}">${escapeHtml(reaction.emoji)} <span>${escapeHtml(String(reaction.count))}</span></button>`;
        })
        .join("");
    const quickEmojis = getQuickReactionEmojis(
        normalizeReactionEmoji,
        5 + mergedByEmoji.size,
    );
    const quick = Array.from(new Set(quickEmojis))
        .filter(
            (emoji) =>
                emoji && !mergedByEmoji.has(normalizeReactionEmoji(emoji)),
        )
        .slice(0, 5)
        .map(
            (emoji) =>
                `<button type="button" class="messages-reaction-add-btn" title="${escapeHtml(emojiDisplayName(emoji, i18n))}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`,
        )
        .join("");
    const reactionDetailsPayload = encodeURIComponent(
        stableJson(
            allReactions.map((reaction) => ({
                emoji: reaction.emoji,
                count: Number(reaction.count ?? 0),
                reactedBy: reaction.reactedBy
                    .map((reactor) => {
                        const accountId = reactor?.accountId ?? null;
                        if (!accountId) return null;
                        const normalizedReactor = {
                            accountId,
                            handle: reactor?.handle ?? null,
                            displayName: reactor?.displayName ?? null,
                            reactedAt: reactor?.reactedAt ?? null,
                        };
                        const resolvedLabel =
                            resolveMemberDisplayName(normalizedReactor);
                        if (!resolvedLabel) return null;
                        return {
                            ...normalizedReactor,
                            label: resolvedLabel,
                        };
                    })
                    .filter(Boolean),
            })),
        ),
    );
    const detailsButtonLabel =
        i18n?.t("module.social.messages.emoji_more") ?? "···";
    const detailsButton =
        hiddenReactionCount > 0
            ? `<button type="button" class="messages-reaction-chip messages-reaction-more-btn messages-reaction-more-btn--details" data-reaction-details="1" data-reaction-details-payload="${escapeHtml(reactionDetailsPayload)}" data-message-id="${escapeHtml(message.id)}" title="${escapeHtml(detailsButtonLabel)}">+${escapeHtml(String(hiddenReactionCount))}</button>`
            : "";
    const moreLabel = i18n?.t("module.social.messages.emoji_more") ?? "···";
    const moreBtn = `<button type="button" class="messages-reaction-more-btn" title="${escapeHtml(moreLabel)}" data-message-id="${escapeHtml(message.id)}" data-reaction-more="1">···</button>`;
    const activeRowClass = hasChips
        ? "messages-reactions-row messages-reactions-row--has-active"
        : "messages-reactions-row";
    const activeClass = hasChips
        ? "messages-reactions-active messages-reactions-active--has-chips"
        : "messages-reactions-active";
    const ownClass = isOwn ? " messages-reactions-row--own" : "";
    const pickerRow = `<div class="messages-reaction-picker-row${ownClass}"><span class="messages-reactions-available">${quick}${moreBtn}</span></div>`;
    const activeRow = `<div class="${activeRowClass}${ownClass}"><span class="${activeClass}">${chips}${detailsButton}</span></div>`;
    return {
        pickerRow,
        activeRow,
    };
}

export function applyThreadReaction(
    container,
    { roomId, accountId, messageId, emoji, active, i18n },
) {
    if (!container) return;
    updateThreadView(container, { roomId, accountId }, (view, order) => {
        const message = view.messages.find(({ id }) => id === messageId);
        const row = Array.from(container.children).find(
            (element) => element.dataset.messageId === messageId,
        );
        if (!message || !row) return false;
        setMessageReactionState(message, emoji, active);
        message.renderOrder = order;
        const markup = renderReactionRows(
            message,
            i18n,
            message.senderId === accountId,
        );
        patchThreadContent(
            row.querySelector('[data-reaction-slot="picker"]'),
            markup.pickerRow,
        );
        patchThreadContent(
            row.querySelector('[data-reaction-slot="active"]'),
            markup.activeRow,
        );
    });
}
