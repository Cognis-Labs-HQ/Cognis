# Module Channel Recovery

**Feature Branch:** feature-deleted-module-channel

## Keep Catalog Content Consistent

Catalog refresh pins manifests and assets to one commit, so deleting a merged branch cannot separate a module from its translations. Channel listings must provide complete 40- or 64-character hexadecimal commit IDs; abbreviated IDs are rejected before catalog content is read.

## Recover Deleted Selections

Deleted channels resolve to the current default branch while valid choices and installed provenance are preserved. Incomplete or malformed provider reads retain the previous complete catalog for retry. Private repository access failures remain visible when branch, release or manifest reads are denied; cached content and the saved channel remain intact.

## Commits

- [5717f520ef59ebf0de20be2583d2f51454b4271b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5717f520ef59ebf0de20be2583d2f51454b4271b)
- [588ffab3d3751e442ceb96e62ad326d9767aa5e6](https://github.com/Cognis-Labs-HQ/Cognis/commit/588ffab3d3751e442ceb96e62ad326d9767aa5e6)
