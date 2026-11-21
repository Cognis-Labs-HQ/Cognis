# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [53f14b9f22c2191c38b90ecccf82f14c50f02684](https://github.com/Cognis-Labs-HQ/Cognis/commit/53f14b9f22c2191c38b90ecccf82f14c50f02684)
- [9fdad54cf036a485a7981eee48c05c819eb5d20d](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fdad54cf036a485a7981eee48c05c819eb5d20d)
