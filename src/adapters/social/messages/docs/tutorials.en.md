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
