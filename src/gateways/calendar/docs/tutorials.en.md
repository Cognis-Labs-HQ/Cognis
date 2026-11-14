# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface | Guide          | Access         |
| -------------- | -------------- | -------------- |
| `/calendar`    | Calendar Guide | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

Date navigation highlights the visible date controls even with no events. Event planning highlights one actual creation slot rather than repeating the whole calendar.

Event planning retains its creation-slot target and explains the wider form, compact reading order and scrolling. The events step explains the striped pending invitation state. The existing guide IDs, six steps, highlightNext values and page lifetime are unchanged; empty calendars keep the date-navigation and creation targets.
