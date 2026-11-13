/** Resolve a final reaction state from the message currently shown to the user. */
export function nextReactionState(messageId, emoji) {
    return !Array.from(
        document.querySelectorAll(".messages-reaction-chip--active"),
    ).some(
        (button) =>
            button.dataset.messageId === messageId &&
            button.dataset.emoji === emoji,
    );
}
