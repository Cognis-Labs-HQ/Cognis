# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface      | Guide              | Access         |
| ------------------- | ------------------ | -------------- |
| `^/profile(?:/\|$)` | Profiles And Posts | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

Identity, posts and account actions target the rendered profile regions, including an empty posts section. The page signal owns the guide lifetime.

Posts use a distinct list target even when the composer is present. Social actions fit their buttons; composer-only preview is omitted on other profiles.

Identity and social actions precede the consecutive posts and preview stages.

## Readable Mobile Content

On phones and tablets, profile identity, post composition and the post timeline come before secondary social sections. Long names, biographies and posts wrap within the available width. The full-banner presentation keeps identity below the image; existing fields and drafts survive resizing.

Preview shows the current title and body before publishing. Return to Compose or rotate the device without losing your draft.

Published posts appear immediately, and deletions update the timeline without reloading.
