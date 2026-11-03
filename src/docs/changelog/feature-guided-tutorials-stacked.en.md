# Guided tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Tutorials belong to a page or URL. The first eligible visit starts the page’s unseen tutorials automatically. A question-mark SVG beside the title in `page-context` replays tutorials available on that page. The host owns presentation and lifecycle; each feature owns its text, targets and script. Tutorials never change permissions.

The host owns rendering, accessibility, event gates, target resolution and lifecycle cleanup. Workspace and Study examples live in their owning components. External modules register plays and targets through ctx, without importing host internals. Tests cover registered flows, missing and replaced targets, asynchronous cancellation, permissions, provider rollback and stale handles. Native Chromium checks cover focus, scrolling, zoom, keyboard and touch blocking, accessibility roles, reduced motion and both themes.

## Page Binding And First Visits

All tutorial action buttons live in an independent instance of the shared floating menu. First-time sessions have no Cancel or Skip action; Escape does not dismiss them. Next remains available during target waits, asynchronous work and event-driven steps, so repeatedly pressing it always reaches completion. Replays expose cancellation with `btn-cancel`. Unrelated navigation, history, account/access loss, provider removal and required popups still release every session. Tutorials never confirm dialogs, submit privileged forms or initiate calls.

## Component-Owned Page Guides

Pages pass authored tutorial contributions in the composer’s `tutorials` array. Each contribution declares an owner, definitions, and an optional `minRole`; each definition supplies its page, localized text and component-owned selectors. `scope` restricts discovery to a visible section. The host publishes scoped targets and runs registration through `ui:tutorial:mountPage`. Removing a page disposes its guides. Optional component providers can use `mountTutorialProvider` from `ui:reuse` and keep their localization and lifecycle ownership.

## Commits

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
