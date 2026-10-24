# Offline Navigation

**Feature Branch:** feature-offline-navigation

## Offline Contract

Production builds prepare a neutral recovery shell. License and Error work offline; unavailable route links are disabled and direct navigation opens the runtime error popup. A real server connection failure activates fallback even when the browser reports an active network.

Declare `public: true` and `offline: { assets: [...] }` on a SPA route. List every public runtime dependency, including locale catalogs and data files. Pages must work without API requests, private account data or host-wide provider discovery. Private routes cannot opt in. Use route links for navigation controls. Unknown or unvisited dependencies remain unavailable.

API responses, credentials and authenticated HTML are not cached. Module invalidation clears the public route catalog and module assets; revision-qualified assets must match the current catalog. Remote changes cannot be observed while disconnected: only the last known public revision is available. Recovery refreshes the catalog and reloads through the dirty-page guard, restoring fresh server authorization. Worker updates wait for existing tabs to close and prepare the recovery set before activation. A first visit without an installed worker cannot start offline.

## Reminder Selection

Select several reminders using the standard visible checkboxes. Each selection remains visible and is saved together. Removing every selection disables reminders, including when the calendar has defaults. Existing custom reminder offsets remain available when editing.

## Commits

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
