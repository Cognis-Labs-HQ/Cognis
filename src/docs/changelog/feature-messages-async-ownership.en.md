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

- https://github.com/Cognis-Labs-HQ/Cognis/commit/62da72d2f6e896ea7d52bf4c1ce7da15802a9966
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0dd00af82a18452217745672bdc5babbf9e817a5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bf23786bfcdcc5d5f4badcdb205c9438f2401be2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fe80f98b1ae4030a0dbbd030d7471234aafc0c5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f434c53b4d1df2d09e57629266575411b0c51fb3
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8cc2dd723c42a2552ea0653adf1e1ad8f8dd2da2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b9ee5c17977491ad6621c46fe96bc2a692004bb4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a2fc0fd084eec300b0f03b6e1a402c72c7918583
- https://github.com/Cognis-Labs-HQ/Cognis/commit/291480ff28497884e7d12a956a5b9dcbcf51a690
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c63b95a5ca6e1fc792c4e32a6a56f1e9df74b22
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8369fb5aabb552af45f7c222e21c37f739bc2da1
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9863f4d28c62b78bea67e0470a43b148fac6fb4c
