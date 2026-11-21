# Reliable Notification Inbox

**Feature Branch:** feature-notification-inbox-outcomes

## Keep Confirmed Inbox State

Failed reads retain confirmed notifications, search results and unread counts. Retry checks the inbox without repeating a write. Rejected, uncertain and acknowledged changes with a failed refresh have distinct feedback.

## Respect Inbox Lifetimes

Internal Notifications 0.5.36 reconciles content, order and read state through adapter-owned flows. Stale requests, removed controls, account changes and provider disposal cannot overwrite a newer inbox. Continuous popup policies and workspace tutorial targets remain unchanged.

## Commits

- [8258aae680b6049b091f6af88d87e7dd0cfdcf77](https://github.com/Cognis-Labs-HQ/Cognis/commit/8258aae680b6049b091f6af88d87e7dd0cfdcf77)
- [d88df86fe5c20571ba8134db71bbbeeecf9c1820](https://github.com/Cognis-Labs-HQ/Cognis/commit/d88df86fe5c20571ba8134db71bbbeeecf9c1820)
- [0dce5557f24f3f32f34286fff1af710389b5de5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0dce5557f24f3f32f34286fff1af710389b5de5c)
