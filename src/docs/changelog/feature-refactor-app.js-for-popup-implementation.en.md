# Composable Library entry popups

**Feature Branch:** feature-refactor-app.js-for-popup-implementation

## Route-backed entry details

Library entries open in clean, history-aware popups with available metadata, relationships, previous and next navigation, and consistent user-menu button styling in Study navigation.

## Extensible detail composition

The detail flow is declared before UI providers load, preserves before-core, core, and after-core ordering, supports removable hooks, and dispatches contributed popup actions.

## Reliable page lifecycle

Direct loads and SPA transitions use the standard authenticated page-composer lifecycle while retaining a single-row, consistently sized Study submenu. Canonical entry links remain shareable, aborted mounts cannot open stale popups, and the popup close control dismisses normally. Study URLs no longer carry a `language` query parameter; the active language button stores its ISO code and supplies the selection during navigation.

## Study-owned language navigation

Study now handles language-button navigation through its own UI capability binding rather than teaching the core app router about Study state. Direct entry routes resolve their schema language before rendering, and directly loaded listings participate correctly in Back navigation.

## Study-owned browser infrastructure

Study SPA routes, child-component discovery, cache invalidation, and the Library detail-flow contract now live with the Study gateway. Core routing and global search matching no longer contain Study-specific paths, APIs, selectors, or component metadata.

## Commits

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
- [a6b4a095](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6b4a09575d55c2d74e28d58a85beecd832e8c6c)
- [fc4bd3f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc4bd3f53c620345d597e94cdfd5f8b611b5c02c)
- [e0e89430](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0e894300370247239ce4b1811a56336db0b3e1c)
- [13886e88](https://github.com/Cognis-Labs-HQ/Cognis/commit/13886e885724482b15279da0c5f0e949ab16fdc9)
- [04cbf360](https://github.com/Cognis-Labs-HQ/Cognis/commit/04cbf3609557d0760bcd7cbfec836a850509c550)
