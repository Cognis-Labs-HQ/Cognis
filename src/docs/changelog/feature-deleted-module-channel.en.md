# Module Channel Recovery

**Feature Branch:** feature-deleted-module-channel

## Keep Catalog Content Consistent

Catalog refresh pins manifests and assets to one commit, so deleting a merged branch cannot separate a module from its translations. Channel listings must provide complete 40- or 64-character hexadecimal commit IDs; abbreviated IDs are rejected before catalog content is read.

## Recover Deleted Selections

Deleted channels resolve to the current default branch while valid choices and installed provenance are preserved. Incomplete or malformed provider reads retain the previous complete catalog for retry. Private repository access failures remain visible when branch, release or manifest reads are denied; cached content and the saved channel remain intact.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b76d7122ab5a0e5471a3247b4cf9d5e04bc2784f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/745d3901c67962142b3e30a7de59922181fd0694
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e63648cbd18664832c77552cc65adfed78d89caf
