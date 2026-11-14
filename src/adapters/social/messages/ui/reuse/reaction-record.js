export function setMessageReactionState(message, emoji, active) {
    message.reactions ??= [];
    let reaction = message.reactions.find((row) => row.emoji === emoji);
    if (!reaction) {
        reaction = { emoji, count: 0, reactedByMe: false, reactedBy: [] };
        message.reactions.push(reaction);
    }
    if (reaction.reactedByMe !== active) reaction.count += active ? 1 : -1;
    reaction.reactedByMe = active;
    message.reactions = message.reactions.filter((row) => row.count > 0);
}
