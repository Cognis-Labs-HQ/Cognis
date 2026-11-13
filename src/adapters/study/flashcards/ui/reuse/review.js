/** Resolve due status consistently for deck galleries and study queues. */
export function isCardDue(progress, cardId, now = Date.now()) {
    const record = progress?.[cardId];
    if (!record) return true;
    const due = Date.parse(record.due);
    return !Number.isFinite(due) || due <= now;
}
