# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [3e8affbdb84f7248cb1ff4b8fb94579325b147e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e8affbdb84f7248cb1ff4b8fb94579325b147e4)
- [1a51f703a335861ec0a0769af89c9392cd407183](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a51f703a335861ec0a0769af89c9392cd407183)
