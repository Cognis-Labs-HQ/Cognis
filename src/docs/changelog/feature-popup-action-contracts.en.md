# Popup Action Contracts

**Feature Branch:** feature-popup-action-contracts

## Respect Focused Actions

Enter and Space keep the focused control. Constructive single-line actions remain available without using CSS classes or action IDs as authority. Native form validation, editing, IME input, tutorial focus and nested lifetimes remain intact.

## Keep Drafts Safely

Unsaved-change confirmations focus safe Cancel and style Discard as destructive. Repeated, pending and stale actions cannot invoke a duplicate callback; explicit closing remains available.

## Unify Popup Footer Controls

Initial, replaced and newly added footers use the same native button renderer and consequence classes, including neutral Done. Neutral controls retain their popup appearance and share wrapping and touch-target rules. This covers the shared-popup portion of issues #542 and #330; the broader caller audit and native browser layout verification remain separate.

## Commits

- [b5a54c65c1bc627fe8ee5887428e64d7e7449db2](https://github.com/Cognis-Labs-HQ/Cognis/commit/b5a54c65c1bc627fe8ee5887428e64d7e7449db2)
