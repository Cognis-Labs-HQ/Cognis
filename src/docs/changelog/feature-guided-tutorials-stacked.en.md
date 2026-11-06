# Guided tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Tutorials belong to a page or URL. The first eligible visit starts the page’s unseen tutorials automatically. A question-mark SVG beside the title in `page-context` replays tutorials available on that page. The host owns presentation and lifecycle; each feature owns its text, targets and script. Tutorials never change permissions.

The host owns rendering, accessibility, event gates, target resolution and lifecycle cleanup. Workspace and Study examples live in their owning components. External modules register plays and targets through ctx, without importing host internals. Tests cover registered flows, missing and replaced targets, asynchronous cancellation, permissions, provider rollback and stale handles. Native Chromium checks cover focus, scrolling, zoom, keyboard and touch blocking, accessibility roles, reduced motion and both themes.

## Page Binding And First Visits

All tutorial action buttons live in an independent instance of the shared floating menu. First-time sessions have no Cancel or Skip action; Escape does not dismiss them. Next remains available during target waits, asynchronous work and event-driven steps, so repeatedly pressing it always reaches completion. Replays expose cancellation with `btn-cancel`. Unrelated navigation, history, account/access loss, provider removal and required popups still release every session. Tutorials never confirm dialogs, submit privileged forms or initiate calls.

## Component-Owned Page Guides

Pages pass authored tutorial contributions in the composer’s `tutorials` array. Each contribution declares an owner, definitions, and an optional `minRole`; each definition supplies its page, localized text and component-owned selectors. `scope` restricts discovery to a visible section. The host publishes scoped targets and runs registration through `ui:tutorial:mountPage`. Removing a page disposes its guides. Optional component providers can use `mountTutorialProvider` from `ui:reuse` and keep their localization and lifecycle ownership.

## Module Translation Keys

Tutorial keys preserve the manifest module ID as one namespace segment. Generic navigation and search labels reuse the shared catalog. Failed page setup releases every tutorial contribution so the page can mount again.

## Tutorial Catalogs

Tutorial locale catalogs are loaded under a revision of their declared translation keys, separately from earlier page catalog loads. This prevents an older in-memory catalog from rejecting newly published tutorial copy. Identical guide contracts reuse the catalog, including offline. Missing preferred-language text falls back to English; genuinely missing English keys still fail registration and roll back the owner. Step keys name their subject rather than their position.

## Visible Highlight Geometry

Highlights use the visible intersection of the target, its clipping or scrolling ancestors and the visual viewport. Page targets avoid the site header and footer; guides targeting those controls still use their own full area. An oversized target that is already visible keeps its scroll position. Callouts try available sides before moving inside the visible target, where misleading offscreen arrows are hidden. Tutorial controls reserve their own space so long translated copy scrolls without covering navigation buttons.

The independent shared floating menu keeps its standard theme, border, buttons, padding and backdrop blur. It sits above the tutorial shade, including the page-header replay chooser. The shade excludes the target, floating controls and broadcast banners; callouts reserve space below visible banners. Controls remain within the viewport in light and dark themes.

## Page Readiness

The host runs `page:ready` after `page:mounted`, with `prepare`, `blocking`, `ready` and `afterReady` stages. Rendering completes while the blocking stage awaits startup work. Deferred login setup joins this stage before release notes. The Changelogs owner awaits its preferences, metadata request and popup dismissal before readiness is published. Cancellation closes an obsolete popup without recording acknowledgement. Automatic tutorials and header replays remain deferred until readiness; navigation invalidates the old page and late work cannot release the replacement.

Future popup owners can append a staged blocker with `registerPageReadinessBlocker` from the shared `page-readiness.js` module before the page is mounted. Pass an owner-unique `id`, optional `order` and owner `signal`; return the promise that resolves when the check or popup finishes. The callback receives `input.signal`, combining page and owner cancellation. Registrations replace safely and dispose with their owner. Consumers use `ui:pageReadiness.isReady()` or the `afterReady` stage to defer non-blocking notifications and other page actions.

## Clear Controls And Copy

Tutorial text describes available tasks and controls without unrelated reassurances about permissions or actions the guide does not perform.

## Guarded Navigation

Steps can opt into `preventNavigation` to keep users on the current page while explaining navigation controls. The Dashboard guide uses it throughout. Pointer and keyboard link activation, programmatic router navigation and router-managed history traversal respect the guard. Next, Back and Finish remain available; authored tutorial route transitions are allowed. Guards release with the step or session.

## Task Walkthroughs

Coverage comprises 55 guides and 175 steps, including 22 administrator guides. Dashboard includes a hands-on search exercise: open the real search control, enter a query, inspect search options and results, and close the finder before continuing. Explanatory steps block accidental hover and activation; interactive steps explicitly allow their target. New contextual guides appear when a flashcard deck, practice session or module details are visible.

Feature guides now cover starting and previewing messages, room membership, post previews, calendar navigation and event planning, recurring-event edits, share filtering and expiry, invitations, library filtering and dictionary comparisons, audio and writing practice, favourites and content requests, deck creation, practice feedback, deck editing/sharing/export, class enrollment, rankings, font preferences, unsaved changes, release notices, user lookup and module configuration/lifecycle. Forms and destructive confirmations remain deliberate feature-owned interactions; guides explain their entry points and yield to required dialogs.

## Dashboard Panels And Actions

The Dashboard walkthrough has 18 steps and deliberately opens the notification pane and account dropdown through their real click handlers. Click exercises suppress hover, while the pane and menu explanations keep destructive or navigational actions inactive. The account guide explains Settings, Documentation, role-specific administration links and Logout. It also covers the page-action dock, language switching, appearance and layout editing.

Transient surfaces publish their element, close operation and owner signal through `ui:transientSurfaces.register(element, close, signal)`. A guide uses `attachLifetime(element, groupSignal)` to release only the matching finder, notification pane or dropdown when its group ends. Tutorial action clicks do not reach background click-away handlers, so menus remain open throughout their explanations.

## Commits

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
- [73d206f](https://github.com/Cognis-Labs-HQ/Cognis/commit/73d206f37913e3cf6d8a7fcf8eed31c383f811f4)
- [9bd2026](https://github.com/Cognis-Labs-HQ/Cognis/commit/9bd2026bf195a4e815b5822f968b94796b99244a)
- [1df4bc6](https://github.com/Cognis-Labs-HQ/Cognis/commit/1df4bc68d8ad108c236caaeb67e09337f9f3d169)
- [0583f247d](https://github.com/Cognis-Labs-HQ/Cognis/commit/0583f247d44676b179a70fe408804b730e73878b) — Keep oversized highlights visible and strengthen tutorial controls.
- [ae593b178](https://github.com/Cognis-Labs-HQ/Cognis/commit/ae593b1781496a4985d787b32b647d95fa595547) — Coordinate startup popups through page readiness before starting tutorials.
- [8a845efb1](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a845efb1cb16a1538a80cc456c82482af4a4c0e) — Renew readiness when a cancelled page remounts the same URL.
- [e65144a29](https://github.com/Cognis-Labs-HQ/Cognis/commit/e65144a29220e5ecc0b10272bf3739716ca52094)
- [6fd10e6f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fd10e6f5b2287cfbe47848a49b749929e0e17c6)
- [7a337d228](https://github.com/Cognis-Labs-HQ/Cognis/commit/7a337d2283f729ae121ef34d4a1becc29c394ec5)
- [a37ebad6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a37ebad6cbfe54e2e1da28144e3dc7a9ffb4e39c)
- [ce721403b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ce721403ba29d74c71a8056ba58f0a25ea315cf0)

Step paths support `minRole`, a synchronous `when({ firstTime, completed, skipped })` boolean predicate, and `dependsOn: ["earlier-step-id"]`. Unauthorized and false-condition stages are excluded from progress. Dependencies must reference earlier stages; unknown, duplicate, self and forward references are rejected. Interaction stages satisfy dependencies only after their event or wait condition succeeds; manually choosing Next skips their dependent branch. Static stages satisfy dependencies with Next. Outcomes passed to conditions are immutable snapshots. Counts reflect the currently eligible path and can expand after an interaction opens a branch. Back rewinds outcomes from its destination; `restart()` and the Restart Tutorial action reset all outcomes and release transient surfaces without replacing the session. The Dashboard Search, notification and account branches require opening their respective controls. Administration requires `minRole: "admin"`; optional dock controls have visibility conditions. Dock highlights follow the live dock bounds, including controls below the footer boundary, while callouts keep their reserved viewport.

Broadcast-banner buttons, links and keyboard activation remain available throughout a tutorial. Activating a banner action yields the tutorial through `ui:tutorial:priority` before any action-owned popup or navigation. Banner focus targets participate in keyboard traversal.

`showToast(message, { minRole: "admin" })` limits operational feedback to administrators and owners. Other or unknown roles receive no toast DOM, timers or dismissal callbacks. Omitting `minRole` keeps normal feedback available to everyone. This client presentation option does not authorize server operations.

- [f681187ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f681187ca572fa4270f9b398d429a3d1177c62d3)

Search overlay steps use the overlay viewport, so shell headers and footers do not clip the search input highlight. Clicking any refinement pill completes the filter exercise. Steps requiring Next (or Finish) highlight that action with a breathing outline; reduced-motion preferences retain a static outline. Waiting and automatically advancing steps do not show this cue.
