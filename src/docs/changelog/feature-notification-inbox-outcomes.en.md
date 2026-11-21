# Reliable Notification Inbox

**Feature Branch:** feature-notification-inbox-outcomes

## Keep Confirmed Inbox State

Failed reads retain confirmed notifications, search results and unread counts. Retry checks the inbox without repeating a write. Rejected, uncertain and acknowledged changes with a failed refresh have distinct feedback.

## Respect Inbox Lifetimes

Internal Notifications 0.5.36 reconciles content, order and read state through adapter-owned flows. Stale requests, removed controls, account changes and provider disposal cannot overwrite a newer inbox. Continuous popup policies and workspace tutorial targets remain unchanged.

## Commits

- [43d6a5ae8fd964d097a1689d54aafd1b0483e30d](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d6a5ae8fd964d097a1689d54aafd1b0483e30d)
- [ab9b731fe6960c954ebfb79df6e28ee5fd0d401a](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab9b731fe6960c954ebfb79df6e28ee5fd0d401a)
- [b8d3ebd1c83345ef615ee397a3c6310bcff61f65](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8d3ebd1c83345ef615ee397a3c6310bcff61f65)
