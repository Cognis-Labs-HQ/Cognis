# Aligned Message Avatars

**Feature Branch:** feature-messages-conversation-initials

## Use Profile Presentation

Conversation authors use the current Profile renderer for initials, colour and the small avatar size (32px). Initials follow the display name, then the handle; an account identifier remains the label when neither is available. Existing avatar images and profile links remain available in avatar-bearing styles. Hover opens the standard profile preview and clicking opens the profile. IRC continues to hide avatars.

## Preserve Conversation Behavior

The Settings Message Style preview uses the same small presentation with synthetic records, without profile links, images, hydration or writes. Missing, disabled or incomplete Profile providers make the preview unavailable; returning providers restore it. Conversation rows keep their current page and account ownership, selection, drafts and read outcomes. Room headers, participant summaries and other avatar surfaces are unchanged; the broader avatar audit remains partial.

Messages 2.8.3 / Profile 4.0.0.

## Commits

- [f714d0e65e81c7cfc76fabe863f7eeb3289709c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f714d0e65e81c7cfc76fabe863f7eeb3289709c4)
