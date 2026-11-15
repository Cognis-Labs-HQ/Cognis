# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [0ff5956143b85559849d3d58491d4e7b14702880](https://github.com/Cognis-Labs-HQ/Cognis/commit/0ff5956143b85559849d3d58491d4e7b14702880)
- [4aa50d65b56dc2ecf4d271516b9a8719bd2519f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/4aa50d65b56dc2ecf4d271516b9a8719bd2519f0)
