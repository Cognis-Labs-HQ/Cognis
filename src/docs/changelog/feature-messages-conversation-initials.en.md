# Aligned Message Avatars

**Feature Branch:** feature-messages-conversation-initials

## Use Profile Presentation

Conversation authors use the current Profile renderer for initials, colour and the small avatar size (32px). Initials follow the display name, then the handle; an account identifier remains the label when neither is available. Existing avatar images and profile links remain available in avatar-bearing styles. Hover opens the standard profile preview and clicking opens the profile. IRC continues to hide avatars.

## Preserve Conversation Behavior

The Settings Message Style preview uses the same small presentation with synthetic records, without profile links, images, hydration or writes. Missing, disabled or incomplete Profile providers make the preview unavailable; returning providers restore it. Conversation rows keep their current page and account ownership, selection, drafts and read outcomes. Room headers, participant summaries and other avatar surfaces are unchanged; the broader avatar audit remains partial.

Messages 2.8.3 / Profile 4.0.0.

## Commits

- [7d1129047b79d5c54ebc2a572387692eb4670f3c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d1129047b79d5c54ebc2a572387692eb4670f3c)
- [39b7601bebb159e99b318b16df5d064a37b86c74](https://github.com/Cognis-Labs-HQ/Cognis/commit/39b7601bebb159e99b318b16df5d064a37b86c74)
