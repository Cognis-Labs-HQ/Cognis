# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                   | Guide             | Access         |
| -------------------------------- | ----------------- | -------------- |
| `^/study/(?:settings\|welcome)$` | Study Preferences | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

Language introductions are supplemental overview guides; activity walkthroughs stay on the current Explore or Flashcards surface. Language settings highlight available and active languages separately.
