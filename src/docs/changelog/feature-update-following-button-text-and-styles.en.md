# Social follow notifications

**Feature Branch:** feature-update-following-button-text-and-styles

## Follow buttons preview unfollow actions

Following-state profile buttons now switch to the unfollow label and cancel styling while hovered, making the destructive action clearer before clicking.

## Follow activity uses the social notification class

Follow actions now register and dispatch through the Social notification category so recipients can receive follow activity notifications through configured notification providers.

## Profile initials prefer profile names

Initials generated for profile avatar fallbacks now use the profile display name before the username and can show a single-letter initial for one-word names.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e6c45656185cf32f63d69ebb49595ad530184d2e
