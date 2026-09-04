# Disable Empty Inbox

**Feature Branch:** feature-disable-delete-notifications-button-when-empty

## Summary

The internal notification inbox now disables the destructive clear-all button when no notifications are present. This prevents unnecessary confirmation prompts and keeps the action state aligned with inbox content.

## Changed Files / Components

- `src/adapters/notify/internal/ui/navbar-plugin.js` — Keeps the clear-all button disabled for empty inboxes and guards the click path from opening the confirmation popup when no notifications exist.
- `src/adapters/notify/internal/ui/notifications.css` — Prevents destructive hover styling while the clear-all button is disabled.
- `src/ui/tests/notification-followups.test.js` — Adds runtime coverage that renders an empty inbox state and asserts the clear-all click path does not call the popup.
- `src/adapters/notify/internal/package.json` and `src/docs/versions.en.md` — Bumps the Internal Notification adapter version to `0.5.3`.

## Commits

- [96d6616](https://github.com/Cognis-Labs-HQ/Cognis/commit/96d6616)
