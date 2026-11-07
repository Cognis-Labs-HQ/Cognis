# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                            | Guide            | Access         |
| ----------------------------------------- | ---------------- | -------------- |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)` | Flashcards Guide | Signed-in user |
| Flashcards · `[data-study-deck]`          | Manage A Deck    | Signed-in user |
| Flashcards · `[data-practice]`            | Practise A Deck  | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

The management guide uses the selected deck container as its boundary, including the edit, share and export controls. It remains unavailable in the deck list.
