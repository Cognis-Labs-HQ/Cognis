# Guided tutorials

**Feature Branch:** feature-guided-tutorials-stacked

The account menu opens the tutorial catalog. Components and enabled external modules contribute localized, replayable plays through `ui:tutorials`. Plays use semantic targets, guarded SPA navigation and cancellable steps; a required popup always takes priority. See [the tutorial contract](/docs/tutorials).

The host owns rendering, accessibility, event gates, target resolution and lifecycle cleanup. Workspace and Study examples live in their owning components. External modules register plays and targets through ctx, without importing host internals. Tests cover registered flows, missing and replaced targets, asynchronous cancellation, permissions, provider rollback and stale handles. Native Chromium checks cover focus, scrolling, zoom, keyboard and touch blocking, accessibility roles, reduced motion and both themes.
