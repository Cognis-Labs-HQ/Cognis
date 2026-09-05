# Composable Library entry popups

**Feature Branch:** feature-refactor-app.js-for-popup-implementation

## Route-backed entry details

Library entries open in clean, history-aware popups with available metadata, relationships, previous and next navigation, and consistent user-menu button styling in Study navigation.

## Extensible detail composition

The detail flow is declared before UI providers load, preserves before-core, core, and after-core ordering, supports removable hooks, and dispatches contributed popup actions.

## Reliable page lifecycle

Direct loads and SPA transitions use the standard authenticated page-composer lifecycle while retaining the Study submenu.

## Commits

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
