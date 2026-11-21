# Carousel Selection Lifetime

**Feature Branch:** feature-carousel-lifetime-integrated639

## Keep retired selections unchanged

Pending carousel activation no longer changes item identity, labels, selection, accessibility state or counters after its owner aborts. Retired callbacks cannot notify the former owner or overwrite selection from a newer mount on the same root.

## Preserve current carousel actions

Live synchronous and asynchronous activation, false-result vetoes, ordered and shared-identifier selection, Add and preview cleanup keep their existing behavior. Existing creation tutorial targets and progression remain unchanged. This does not cancel or undo work inside owner callbacks; shared UI has no separate component version.

## Commits

- [7e9746dde4b5ce65f426e1baeef8b09bd814c0e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e9746dde4b5ce65f426e1baeef8b09bd814c0e0)
- [7adfa7602f9e74515dacf83ce779572bb8faffc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/7adfa7602f9e74515dacf83ce779572bb8faffc3)
