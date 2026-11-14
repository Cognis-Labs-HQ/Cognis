# Module Channel Recovery

**Feature Branch:** feature-deleted-module-channel

## Keep Catalog Content Consistent

Catalog refresh pins manifests and assets to one commit, so deleting a merged branch cannot separate a module from its translations. Channel listings must provide complete 40- or 64-character hexadecimal commit IDs; abbreviated IDs are rejected before catalog content is read.

## Recover Deleted Selections

Deleted channels resolve to the current default branch while valid choices and installed provenance are preserved. Incomplete or malformed provider reads retain the previous complete catalog for retry. Private repository access failures remain visible when branch, release or manifest reads are denied; cached content and the saved channel remain intact.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7b5d27e196c7597948332a39196d7ca147f2098b
