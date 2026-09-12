# Library and Safety Fixes

**Feature Branch:** work

## Focused Library UI modules

The Study Library browser entry point is now a small page coordinator. Card rendering, layered grids, detail popups, selection, browser interactions, and variant interactions live in focused modules of approximately 100–200 lines while preserving the existing UI behavior.

## Atomic progress corrections

Ordinary progress events can no longer inject compensation identifiers. Corrections use the dedicated operation, and the persistent event store atomically guarantees that each target has at most one correction.

## Authorized Library deletion

Library deletion now resolves the final cascade and authorizes every affected entry inside the deletion transaction, closing the race between authorization and relationship changes.

## Stronger module boundaries

External module validation rejects every symbolic link, including dotted directory names, and recognizes protected UI classes targeted through class attribute selectors.

## Secondary spellings in titles

Word and sentence alternate spellings now appear as navigable secondary title content directly beneath the primary spelling. Character-style structural variants are no longer repeated in detail content.

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
