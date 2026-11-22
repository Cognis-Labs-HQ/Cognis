# Readable Message Text

**Feature Branch:** feature-message-text-wrapping

## Wrap Text To Its Available Width

Messages no longer use character count to decide whether text can wrap. Short paragraphs, wide glyphs, emoji and CJK text can wrap within their existing message width, including when the conversation narrows or text grows.

## Preserve Conversation Features

Explicit newlines, Markdown, escaped HTML-like text and long-token wrapping are retained across default, speech-bubble and IRC styles. Incoming and outgoing messages retain avatars, reactions, read receipts and metadata placement. Messages is updated to 2.7.41 with synchronized dependency ceilings and documentation.

## Commits

- [9465d9c27de7ee2a3968d7828a4c81c38717eeeb](https://github.com/Cognis-Labs-HQ/Cognis/commit/9465d9c27de7ee2a3968d7828a4c81c38717eeeb)
- [82ddcf323324009e2deca44c66e90e5a4e76b5fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/82ddcf323324009e2deca44c66e90e5a4e76b5fd)
