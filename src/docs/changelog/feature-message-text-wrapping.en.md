# Readable Message Text

**Feature Branch:** feature-message-text-wrapping

## Wrap Text To Its Available Width

Messages no longer use character count to decide whether text can wrap. Short paragraphs, wide glyphs, emoji and CJK text can wrap within their existing message width, including when the conversation narrows or text grows.

## Preserve Conversation Features

Explicit newlines, Markdown, escaped HTML-like text and long-token wrapping are retained across default, speech-bubble and IRC styles. Incoming and outgoing messages retain avatars, reactions, read receipts and metadata placement. Messages is updated to 2.7.41 with synchronized dependency ceilings and documentation.

## Commits

- [4c445cd18fa693c22b1b2a88d37e99d6adf62398](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c445cd18fa693c22b1b2a88d37e99d6adf62398)
- [19f39b7de3d445be34df1a162057ad22fafb87b3](https://github.com/Cognis-Labs-HQ/Cognis/commit/19f39b7de3d445be34df1a162057ad22fafb87b3)
