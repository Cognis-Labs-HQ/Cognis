# Reliable Notification Inbox

**Feature Branch:** feature-notification-inbox-outcomes

## Keep Confirmed Inbox State

Failed reads retain confirmed notifications, search results and unread counts. Retry checks the inbox without repeating a write. Rejected, uncertain and acknowledged changes with a failed refresh have distinct feedback.

## Respect Inbox Lifetimes

Internal Notifications 0.5.36 reconciles content, order and read state through adapter-owned flows. Stale requests, removed controls, account changes and provider disposal cannot overwrite a newer inbox. Continuous popup policies and workspace tutorial targets remain unchanged.

## Commits

- [cfe7a4001e6be4f26b15e82b199d18edbb2be42e](https://github.com/Cognis-Labs-HQ/Cognis/commit/cfe7a4001e6be4f26b15e82b199d18edbb2be42e)
- [faba21400a8fa7680a3e4e8f48aad4d05eab7a7e](https://github.com/Cognis-Labs-HQ/Cognis/commit/faba21400a8fa7680a3e4e8f48aad4d05eab7a7e)
- [024c4b6996da3c2f45a66ff876480140e245a3be](https://github.com/Cognis-Labs-HQ/Cognis/commit/024c4b6996da3c2f45a66ff876480140e245a3be)
