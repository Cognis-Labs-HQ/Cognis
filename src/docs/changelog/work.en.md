# Stable Child Card Navigation

**Feature Branch:** work

## Stable Child Positions

Child cards preserve their fitted positions while deeper branches open. New descendants are placed by depth into visible free slots with collision clearance, preventing cards and connectors from jumping or overlapping.

## Reliable Pointer Navigation

Diagonal routes now have a larger continuous hit corridor, branch changes use a short hover-intent delay, and active cards no longer pulse. Direction fallback ordering also keeps initial child layouts compact around their preferred axis.

## Commits

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
