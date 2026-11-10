# Guided tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Study separates its general navigation guide from language content guides. Enrolled language guides replace generic Explore and walk through real card details, drawing and card creation using conditional branches and scoped lifetimes.

Replaying a tutorial selects a currently visible example card. Related steps keep the same card throughout that session, including after reordering or restarting.

Tutorials belong to a page or URL. The first eligible visit starts the page’s unseen tutorials automatically. A question-mark SVG beside the title in `page-context` replays tutorials available on that page. The host owns presentation and lifecycle; each feature owns its text, targets and script. Tutorials never change permissions.

The host owns rendering, accessibility, event gates, target resolution and lifecycle cleanup. Workspace and Study examples live in their owning components. External modules register plays and targets through ctx, without importing host internals. Tests cover registered flows, missing and replaced targets, asynchronous cancellation, permissions, provider rollback and stale handles. Native Chromium checks cover focus, scrolling, zoom, keyboard and touch blocking, accessibility roles, reduced motion and both themes.

## Page Binding And First Visits

All tutorial action buttons live in an independent instance of the shared floating menu. First-time sessions have no Cancel or Skip action; Escape does not dismiss them. Next remains available during target waits, asynchronous work and event-driven steps, so repeatedly pressing it always reaches completion. Replays use Skip to leave the guide. Unrelated navigation, history, account/access loss, provider removal and required popups still release every session. Tutorials never confirm dialogs, submit privileged forms or initiate calls.

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

Step paths support `minRole`, a synchronous `when({ firstTime, completed, skipped })` boolean predicate, and `dependsOn: ["earlier-step-id"]`. Unauthorized and false-condition stages are excluded from progress. Dependencies must reference earlier stages; unknown, duplicate, self and forward references are rejected. Interaction stages satisfy dependencies only after their event or wait condition succeeds; manually choosing Next skips their dependent branch. Static stages satisfy dependencies with Next. Outcomes passed to conditions are immutable snapshots. Counts reflect the currently eligible path and can expand after an interaction opens a branch. Back rewinds outcomes from its destination; `restart()` and the Restart Tutorial action reset all outcomes and release transient surfaces without replacing the session. The Dashboard Search, notification and account branches require opening their respective controls. Administration requires `minRole: "admin"`; optional dock controls have visibility conditions. Dock highlights follow the live dock bounds, including controls below the footer boundary, while callouts keep their reserved viewport.

Broadcast-banner buttons, links and keyboard activation remain available throughout a tutorial. Activating a banner action yields the tutorial through `ui:tutorial:priority` before any action-owned popup or navigation. Banner focus targets participate in keyboard traversal.

`showToast(message, { minRole: "admin" })` limits operational feedback to administrators and owners. Other or unknown roles receive no toast DOM, timers or dismissal callbacks. Omitting `minRole` keeps normal feedback available to everyone. This client presentation option does not authorize server operations.

Search overlay steps use the overlay viewport, so shell headers and footers do not clip the search input highlight. Clicking any refinement pill completes the filter exercise. Steps requiring Next (or Finish) highlight that action with a breathing outline; reduced-motion preferences retain a static outline. Waiting and automatically advancing steps do not show this cue.

Each tutorial step now explicitly declares `highlightNext`: explanations that require Next or Finish enable it, while interaction- and wait-driven exercises disable it. The cue retains a static outline for reduced motion. All existing tutorials were reviewed for this distinction, including search results and notification explanations.

Tutorial coverage is required for every UI-facing component. Contributor guidance requires user-first, task-focused walkthroughs and a review of existing tutorials whenever features or UI behavior change.

Back from outside a completed step group or dependency branch returns to its opener and clears its outcomes. Back within a branch remains sequential. This avoids revisiting a closed Search panel and automatically skipping to the exit.

Page steps can declare `targetMatch: "first"` to select the first visible, usable match inside their declared section. The default remains unique matching. Missing or disabled targets are skipped according to the authored policy. Action-specific highlights now point to editable power switches, role selectors, quota fields, notification tests, share controls, records and module actions. Components uses an editable displayed power switch; required and hidden controls are excluded.

## Visible tutorial regions and recovery

Restart Tutorial is the persistent recovery action; the tutorial no longer renders a Retry button. UI-facing introductory steps now highlight their referenced regions, including empty Jitsi meeting lists and Find Participants. Learning providers use published Study language targets and the public workspace target. Explicit `highlightNext` remains enabled on explanatory steps and disabled on event-driven stages.

## Shared floating menu queue

Floating menus use the version-one `ui:floatingMenus` capability and the staged `ui:floatingMenu:request`, `present`, `dismiss` and `release` flows. Equal priorities queue in request order; higher priorities suspend lower menus. A lease exposes `ready` (first grant or cancellation), `present(element, { visible })`, `dismiss(element)` and `dispose()`. Tutorial sessions reserve priority 100 until completion, cancellation or owner removal, including between steps. Composer slots and replay choosers use the same queue. Aborted requests and stale presentations cannot replace newer menus; empty slots yield and page teardown removes observers and reservations.

## Animation-only Next cue

The Next/Finish cue uses only the breathing animation, without a permanent outline. Reduced-motion preferences disable the animation; normal keyboard focus remains visible.

## Precise tutorial targets

Dock callouts retain visible control anchors below the menu reservation and avoid the actual floating action menu. The replay step highlights the ? button itself. The button retains the theme text color during tutorials while replay is guarded against replacing an active guide.

## Completion survives updates

Completion belongs to the stable account and owner/tutorial ID. Content and package updates never reset it. A completed tutorial runs again only when requested through the page-header ? control. Preserve IDs when revising guides; completion remains in the account’s browser storage. Every successful session records completion before page discovery resumes, including guides started directly through a provider’s public handle.

## Replay exit action

Tutorial replays offer Skip as their single exit button; the redundant Cancel button is removed. First-time guides retain their existing progression controls.

## Isolated Settings Guide

The font step uses Settings-owned strings from the host catalog. Optional Classes translations are no longer needed to register Settings guides. Component guide coverage stays in each owner’s docs.

## Consistent Locale Indentation

Locale XML touched by the tutorial PR uses consistent two-space string indentation. Formatting preserves translation values; the font-step strings move from Classes to Settings in all four languages.

## Readiness During Document History

Back and Forward within Docs or Changelogs retain the current mount’s readiness. Committed route replacement and page lifetime cancellation still invalidate it; an internal document-history event does not rerun startup blockers.

## Tutorial menu actions

Restart Tutorial appears after the first visible step. Replays offer Skip before the last visible step; the last step offers Finish. A one-step guide offers neither Restart Tutorial nor Skip. First-time guides continue to omit Skip throughout.

Document covered pages and access requirements in the owning component’s existing documentation, without a separate aggregate inventory.

## Remove Browser Demo Fixtures

Standalone browser/demo pages and their scenario modules are removed. Shared helpers used by automated tests remain in place.

## Selected-deck management

The management guide uses the selected deck container as its boundary, including the edit, share and export controls. It remains unavailable in the deck list.

## Header replay alignment

The ? button sits in line with the page title. It has no hover tooltip and retains its localized accessible label.

## Inline replay button

The ? button sits in line with the page title. It has no hover tooltip and retains its localized accessible label.

## Refine header replay control

The replay control is a compact, unboxed icon with a clear gap from the page title. It matches the title row without enlarging it, keeps the theme text color, and shows subtle hover and visible keyboard-focus feedback. The tooltip remains absent.

## Complete marketplace boundaries

Marketplace guides contain the toolbar, cards, source settings and module-detail actions while retaining their list/detail conditions.

## Recover interrupted presentation

Target loss during asynchronous rendering is retried before readiness is published. Restarted or cancelled presentations cannot resume stale recovery or strand the floating menu.

## Independent visibility conditions

`scope` bounds targets and discovery. Optional `visibleWhen` requires a unique visible element without restricting targets to its descendants; targets still stay inside the component root. Library Administration uses this for its browser visibility while highlighting sidebar search. Invalid selectors fail registration and roll back the owner.

## Intentional page guides

Guides follow visible UI order and use distinct rendered controls. Settings omits explanations of unavailable unsaved-change actions. Profile, Users, Docs, Calendar and Study use meaningful targets, including empty calendars, the document sidebar and card details.

## SPA and target recovery

Readiness blockers share replacement-safe ownership across bundled and direct imports. Page lifetimes release old contributions. Scrolling or reflow cannot silently skip a previously displayed target. One automatic guide runs per visible surface; supplemental introductions remain selectable through ?.

## Tutorial authoring rules

Authoring guidance and all four host tutorial documents cover active-view discovery, stable cards, explicit popup branches, optional and empty states, UI order, cleanup and source/production verification. The account dropdown closes before tutorial startup.

## Asynchronous detail branches

Detail and class-management branches wait for their opened surfaces. Optional stage counts are refreshed after setup, so a missing writing action is excluded before displaying the next-step controls. An unrelated dialog interrupts the guide even when stacked above its allowed detail popup. Only active popup portals provide targets; closing overlays cannot supply a new branch or its writing action. Optional conditions use the public owner-authorized targetAvailable result rather than shared modal markup.

## Restart Action Placement

Restart Tutorial is the first action in the floating menu and uses btn-cancel styling. It remains hidden on the first visible step.

## Focused Walkthroughs

Tutorials now target the full meeting Participants element and Available Participants section, distinguish Profile posts and compact social actions, remove duplicate Messages guidance and handle empty Shares. Language-module guides require explicit enrollment and begin with useful activities. Component administration includes conditional detail and settings exploration; optional administration controls are excluded when absent. Tutorial choices use the shared breathing animation, and content describes useful actions and outcomes.

## Stable Examples And Empty Chats

Related card steps share a stable targetScope container: the favourite control and card details must refer to the same example after reordering. targetScope is a page-owned CSS selector, reused by related steps, and cannot be combined with portal. Verify computed animation colours for tutorial choices outside an active tutorial layer; Cancel stays unanimated. Configuration examples must have an editable field in their declared schema; an endpoint alone does not establish configurability. Omit room-management stages when no room exists and keep Profile social actions before its adjacent post stages.

## Replay And Settings Ownership

Example targets and shared card scopes reset for each new replay session, while Back and Restart retain the current session’s example. Test replay after hiding an old card without disconnecting it. A queued control must not be replaced in a guide by a nearby label: omit the stage while the real control cannot be shown. Adapter editors opened through the injected popup API share host-owned content targets and transient lifetimes, including custom editors and multi-page forms. Preserve their onOpen callback and close protection; nested confirmation dialogs retain their own modal identity.

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
- [f681187ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f681187ca572fa4270f9b398d429a3d1177c62d3)
- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c754784d85d080a675615e35f01281ee6c4b)
- [f578b8115](https://github.com/Cognis-Labs-HQ/Cognis/commit/f578b8115e452d8afae8ef21dbbd86dd5756eceb)
- [c7eefff5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7eefff5ad35c79574c1067ee97032cc6a76045a)
- [ddf8e825b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ddf8e825b565329c8b676de10ff4d411c133b6e1)
- [90fffbcb7](https://github.com/Cognis-Labs-HQ/Cognis/commit/90fffbcb7ff0a12417bf470febee6bfc05c30990)
- [7f62e2fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f62e2fa80bc97b99acd51a6f5334c04bd350cb5)
- [c3b6df7dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3b6df7dc95f6e50e9e050d797b6b9c80398d5cf)
- [3ab1a20da](https://github.com/Cognis-Labs-HQ/Cognis/commit/3ab1a20da1a049bcfc8acabc4586f9c336c3fc12)
- [6d7276bad](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d7276bad6c38081af1c6d688255323df5f48e71)
- [73e90e7f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/73e90e7f6950a3ec1557d896d745d1593d7419da)
- [1b4c0e338](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b4c0e3380b78f86ab4e6b54d8751c7805023f89)
- [ed98d0a85](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed98d0a85646823c09848713d32a9f6f9d8652be)
- [d23429b0f](https://github.com/Cognis-Labs-HQ/Cognis/commit/d23429b0f4df4ec6f5c276678e9eb7fc09651944)
- [b6874a330](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6874a3309123f93968bec3c7a1091354f71c5d1)
- [0dd7b9917](https://github.com/Cognis-Labs-HQ/Cognis/commit/0dd7b9917948061b2e1ea929c00748d20fbcc6c7)
- [6cfa9769f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6cfa9769f146c65e7f1c268d458e011900c2459a)
- [b5c47c643](https://github.com/Cognis-Labs-HQ/Cognis/commit/b5c47c6438ef41910e0409942e04a1f5d8031272)
- [a06345997](https://github.com/Cognis-Labs-HQ/Cognis/commit/a063459977156137527f6997c466890fc40e7171)
- [87b6a4796](https://github.com/Cognis-Labs-HQ/Cognis/commit/87b6a479635cff8fc42f1db24762e5b6d0cebbc1)
- [c6478d674](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6478d674dcf0001d89e67dc1456b4cbcd812d44)
- [d8d06956e](https://github.com/Cognis-Labs-HQ/Cognis/commit/d8d06956e993963cf51794e90bed3b145bb49deb)
- [b62756188](https://github.com/Cognis-Labs-HQ/Cognis/commit/b627561886394643fa454d32b6ece0064e8e9666)
- [fac81c153](https://github.com/Cognis-Labs-HQ/Cognis/commit/fac81c153f7d6ce0b5dfe8c84c2eec1aae6953f6)
- [1de0a8703](https://github.com/Cognis-Labs-HQ/Cognis/commit/1de0a870342b69c261dc621cd48e7a838cc87986)
- [03b052822](https://github.com/Cognis-Labs-HQ/Cognis/commit/03b052822981b8bbeaf692de6ec3cfc908d6e6e3)
- [92aef5cfb](https://github.com/Cognis-Labs-HQ/Cognis/commit/92aef5cfbeb5be722119219c857b3fb15690233e)
