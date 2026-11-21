# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [cf14c5176bbf0ee606277cc0c2001ab59fc2c541](https://github.com/Cognis-Labs-HQ/Cognis/commit/cf14c5176bbf0ee606277cc0c2001ab59fc2c541)
- [f27a37e4f2f1ea5b944b21e1f6b4738372575198](https://github.com/Cognis-Labs-HQ/Cognis/commit/f27a37e4f2f1ea5b944b21e1f6b4738372575198)
