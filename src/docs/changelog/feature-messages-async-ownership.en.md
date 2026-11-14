# Reliable Conversation Updates

**Feature Branch:** feature-messages-async-ownership

## Keep The Selected Conversation Current

Late room updates no longer replace the latest selection. Pending header, message, key and action updates stop when their view is no longer current.

## Preserve Drafts And Send Results

Sending clears only the submitted draft revision after acknowledgement or durable queuing. Newer edits and original-room drafts survive room switches. Duplicate submissions remain blocked while sending. A refresh failure reports that the message was sent or queued instead of inviting a resend.

## Keep Unread Counts Honest

Failed read-status acknowledgements leave unread badges unchanged and show localized feedback without repeated notifications during the same failure. The composing tutorial explains how to write the next draft while sending.

The shared draft manager accepts an optional resource-path resolver. Messages uses the original room path for reading, saving and clearing drafts, while other pages retain their current-path behavior and all drafts remain account-scoped.

## Keep Late Failures Scoped

Background update failures show a localized notice and retain the current drafts. Repeated failures are logged, but the notice is shown again only after recovery or a new conversation selection. Late failures from a room or account you have left cannot show stale send errors, start follow-up reads, or interrupt the current conversation. Leaving and reopening Messages also ends the old view’s pending updates.

Reaction changes and Load Earlier keep their results within the conversation where they started. Current failures show a localized update notice and are logged without message contents; failures from a room, account or page you have left are ignored. These actions do not retry automatically. The Preview tutorial covers formatting, links and line breaks; it does not describe attachments.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/d8e546ce544f6c9bd5bae4c680df2e19c8a44b69
