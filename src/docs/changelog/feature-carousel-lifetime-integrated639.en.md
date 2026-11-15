# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [2f8afd8a8370dcf266dc52872a9a2be71dacd476](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f8afd8a8370dcf266dc52872a9a2be71dacd476)
