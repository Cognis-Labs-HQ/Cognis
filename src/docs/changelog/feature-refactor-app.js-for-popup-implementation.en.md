# Route-backed Library entry details

**Feature Branch:** feature-refactor-app.js-for-popup-implementation

## Deep-linked entry popup

Library entries now open as composable, route-backed popups with complete available metadata, relationship links, contributed actions, and previous/next navigation.

## Clean Library URLs

Entry identity now stays in browser history state instead of the address bar. Refresh and browser navigation preserve the active popup, while legacy deep links are migrated to the clean Library URL.

## Reliable page refresh

Direct Library loads now use the shared authenticated page-entry lifecycle, ensuring UI providers and the page-loading flow are ready before the Library mounts.

## Commits

- https://github.com/Cognis-app/Cognis/commit/f29be454
- https://github.com/Cognis-app/Cognis/commit/3695db82
- https://github.com/Cognis-app/Cognis/commit/fbf97f59
