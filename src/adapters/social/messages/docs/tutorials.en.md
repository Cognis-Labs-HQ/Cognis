# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface       | Guide           | Access         |
| -------------------- | --------------- | -------------- |
| `^/messages(?:/\|$)` | Messaging Guide | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

The router signal bounds tutorial registrations and the page composer. Scrolling retains tutorial controls; a temporarily lost displayed target is recovered without silently advancing.

The walkthrough explains composing once, targeting the message input and then its preview control separately.

Room management is excluded from the path and count until a room header is available.

The room-history step covers the same conversation region in the default, speech-bubble and IRC styles. Messages wrap within that region while preserving authored line breaks and Markdown. The guide keeps its existing targets, sequence and completion identity.

The message-input step explains that you can start the next draft while a message sends. Only the submitted version clears after acknowledgement or durable queuing; newer edits remain. The input and preview keep their separate targets and existing order.

The room-history step explains selecting text during conversation updates and loading earlier messages while retaining your place. Its region, sequence, completion identity and access rules are unchanged.
