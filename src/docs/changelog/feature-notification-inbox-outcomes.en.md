# Reliable Notification Inbox

**Feature Branch:** feature-notification-inbox-outcomes

## Keep Confirmed Inbox State

Failed reads retain confirmed notifications, search results and unread counts. Retry checks the inbox without repeating a write. Rejected, uncertain and acknowledged changes with a failed refresh have distinct feedback.

## Respect Inbox Lifetimes

Internal Notifications 0.5.36 reconciles content, order and read state through adapter-owned flows. Stale requests, removed controls, account changes and provider disposal cannot overwrite a newer inbox. Continuous popup policies and workspace tutorial targets remain unchanged.

## Commits

- [c96b6c2464859bf1ce5ec0e36746f3459bd297ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/c96b6c2464859bf1ce5ec0e36746f3459bd297ff)
