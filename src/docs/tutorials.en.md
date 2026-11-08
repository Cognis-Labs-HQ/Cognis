# Guided Tutorials

Tutorials belong to a page or visible view. On its first eligible visit, one unseen guide starts automatically. The question-mark SVG beside the page title replays the available guides. The host owns presentation and lifecycle; each feature owns its text, targets and script.

## Register A Play

Browser providers consume `ui:tutorials` through their scoped ctx. The contract version is `1`. Registration handles belong to an owner, and that owner's required `AbortSignal` bounds its lifetime.

```js
export async function mountProvider(ctx) {
    const tutorials = ctx.capabilities.get("ui:tutorials");
    if (tutorials?.version !== 1)
        throw new Error("tutorial_contract_unavailable");
    const owner = tutorials.owner("module.example", {
        signal: ctx.signal,
        stringsBaseUrls: ["/static/modules/example/languages"],
    });
    try {
        const target = await owner.target("primary", {
            root: () => document.querySelector(".example-panel"),
            resolve: () =>
                document.querySelector(".example-panel [data-example-primary]"),
        });
        const play = await owner.register({
            version: 1,
            page: "/example",
            id: "introduction",
            titleKey: "module.example.tutorial.title",
            steps: [
                {
                    id: "primary",
                    highlightNext: false,
                    target: target.id,
                    titleKey: "module.example.tutorial.primary.title",
                    bodyKey: "module.example.tutorial.primary.body",
                    effects: { callout: true, arrow: true, spotlight: true },
                    interaction: "target",
                    advance: { event: "click" },
                },
            ],
        });
        ctx.capabilities.contribute("example:tutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
```

Register through `mountProvider`; importing a script must not register anything. Return `owner.dispose` and dispose partial registrations on failure. Workspace and Study supply built-in plays. The external-module fixture under `src/ui/reuse/tutorials/tests/fixtures/` demonstrates an independent public-contract consumer.

## Page Binding And First Visits

Every play requires `page`: an exact pathname such as `/dashboard`, or a trusted synchronous predicate `({ pathname }) => boolean` for a group of URLs or a page-specific condition. This is separate from step navigation. Starts outside the binding are rejected. Registration, page mounts, account changes and popup dismissal refresh discovery; removed providers withdraw their help action. Required popups defer automatic starts.

Study exposes `study:tutorialTargets.matchesPage({ pathname, language })` for overview-bound language introductions. Activity guides belong to their current host view; switching Kana to Kanji must not start a language introduction or route back to Study. The composer publishes completed mounts through `page:mounted` (`publish`).

## Targets And Localization

Target names become `owner:name`. Targets are private unless explicitly published with `public: true`; cross-component consumers use the returned semantic ID, never private selectors. Duplicate owner, play and target IDs are rejected. A resolver returns exactly one same-document element or `null`; publish resolvers rather than retained page nodes. Optional `root` restricts resolution and `signal` can shorten a target's lifetime. Hidden, inert and disabled targets are unavailable. Withdrawing a target cancels a session currently using it.

Resolvers are re-evaluated after replacement and while the view is active. Open Shadow DOM targets are supported when the declared root includes their host. Closed roots and frame contents are unsupported. Embedded elements cannot be used in a blocking target or its descendants because the host cannot enforce their input policy. Portals require an explicitly published same-document root.

`stringsBaseUrls` uses the host's localized catalogs and English fallback. Catalog reads and replay resolve the current displayed language, without refreshing the page. A contributor can alternatively supply `i18n`, either a resolver or an asynchronous resolver factory. Missing required translations reject registration or the operation. All owner text renders as plain text; HTML strings are never interpreted.

## Step Options

- `effects`: independently enable `callout`, `arrow` and `spotlight`. Callout defaults to true; the others default to false. Explanatory text stays accessible when visually hidden. Controls and progress remain available.
- `placement`: `auto`, `top`, `bottom`, `left` or `right`; `padding` is 0–40 pixels. Placement tracks nested scrolling, resize, layout changes and the visual viewport. Initial off-screen targets are scrolled into view; later deliberate scrolling is respected.
- `interaction`: `none` (default for explanatory steps), `free` or `target`. `none` shields the highlighted region and blocks page activation and JavaScript hover handlers, while preserving tutorial controls. `target` allows pointer, touch and keyboard activation within the target and tutorial controls. Steps with `advance` default to `target`; `none` cannot require an interaction event.
- `suppressHover`: an optional boolean for interactive steps. Set it to true with `interaction: "target"` to allow the target’s click and keyboard activation while suppressing JavaScript hover handlers. The notification and account openers use it; other page interactions remain restricted.
- `layer`: `page` (default) or `overlay` for a step deliberately targeting a transient surface such as the search finder. Required decision popups still cancel the session. `enter` and `waitFor` also receive `sessionSignal`, which remains active across steps and aborts on completion, cancellation or owner teardown.
- `group`: an optional semantic identifier for adjacent steps that share a transient surface. `enter` and `waitFor` receive `groupSignal`; it aborts before leaving the group, on session completion, and when returning to the group’s first step. Bind search ownership to this signal so skipping the finder’s Close step still releases it before the account walkthrough.
- `preventNavigation`: an optional boolean that blocks link activation and router navigation while the step is active, including history traversal handled by the router. It defaults to false. Tutorial-owned `route` transitions remain available. Progression and disposal release the guard. The Dashboard guide enables it so highlighting the navigation does not take the user away.
- `advance`: a `click`, `change`, `input`, `submit` or `keydown` event, optional keyboard `key`, and optional synchronous/asynchronous `accept(event)` predicate. Repeated input advances once. An async predicate must resolve to `true`.
- `enter({ signal, target, stepId })`: trusted setup callback, optionally returning a cleanup function. `waitFor` receives the same context and advances on fulfillment. Both are bounded to fifteen seconds and cancelled with the step. Async cleanup failures are logged; owners should cancel their asynchronous work through the supplied signal.
- `route`: a same-origin path without query data, or a trusted callback resolving such a path. Navigation uses `ui:navigate` and preserves its authorization, offline and unsaved-change decisions. Route callbacks let feature owners resolve their own navigation; Study exposes this through `study:tutorialTargets.route({ language, area })`, where area is `overview`, `explore` or `flashcards`.
- `missing`: `timeoutMs` from 0 to 15000, default 5000, and `action` of `cancel`, `skip` or `retry`. Skip advances past the missing step; retry keeps the missing-target view available with Restart Tutorial and Next. Waiting never locks the page.

Definitions declare version 1, unique step IDs, localized title keys and at most 100 steps. Unsupported versions, unknown fields and malformed options are rejected. Callbacks are trusted component code; never compile or evaluate downloaded script strings.

## Sessions And Flows

`await owner.register(play)` returns `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` reads permitted plays for that page. `refreshPage()` refreshes discovery; `openPage()` starts the only matching play or offers the matching plays in a shared floating menu. `await tutorials.start(id)` or `start()` returns `ready`, `finished`, `state()`, `next()`, `back()`, `restart()`, `retry()`, `skip()`, `cancel()` and `dispose()`. `current()` is a read-only snapshot.

Only one session is active. A competing start rejects unless `{ replace: true }` explicitly cancels it. Registration, targets, discovery, page entry, replay, start and step actions use `ui:tutorial:<action>` flows with `validate`, `execute` and `after` stages. Consumers must not bypass these capabilities.

All tutorial action buttons live in an independent instance of the shared floating menu. First-time sessions have no Cancel or Skip action; Escape does not dismiss them. Next remains available during target waits, asynchronous work and event-driven steps, so repeatedly pressing it always reaches completion. Replays use Skip to leave the guide. Unrelated navigation, history, account/access loss, provider removal and required popups still release every session. Tutorials never confirm dialogs, submit privileged forms or initiate calls.

Completion and cancellation remove overlays, floating menus, listeners, observers and pending work, then restore focus where appropriate. Late callbacks cannot revive old steps. Completed tutorial IDs are stored in this browser under the current account, separately from other accounts. Interrupted or failed first visits remain eligible on a later visit; failures do not automatically loop on the current page. Clearing browser storage makes them unseen again. Consumers may observe `cognis:tutorial-presented` and `cognis:tutorial-finish`.

## Component-Owned Page Guides

Pages pass authored tutorial contributions in the composer’s `tutorials` array. Each contribution declares an owner, definitions, and an optional `minRole`; each definition supplies its page, localized text and component-owned selectors. `scope` restricts discovery to a visible section. The host publishes scoped targets and runs registration through `ui:tutorial:mountPage`. Removing a page disposes its guides. Optional component providers can use `mountTutorialProvider` from `ui:reuse` and keep their localization and lifecycle ownership.

```js
createPageComposer(root, {
    signal,
    i18n,
    pageContext,
    elements,
    tutorials: [
        {
            owner: "example.page",
            minRole: "admin",
            definitions: [
                {
                    id: "review",
                    page: "/example",
                    scope: ".example-panel",
                    titleKey: "example.tutorial.title",
                    steps: [
                        {
                            id: "options",
                            highlightNext: true,
                            selector: ".example-options",
                            titleKey: "example.tutorial.options.title",
                            bodyKey: "example.tutorial.options.body",
                        },
                    ],
                },
            ],
        },
    ],
});
```

Document covered pages and access requirements in the owning component’s existing documentation, without a separate aggregate inventory.

## Tutorial Catalogs

Tutorial locale catalogs are loaded under a revision of their declared translation keys, separately from earlier page catalog loads. This prevents an older in-memory catalog from rejecting newly published tutorial copy. Identical guide contracts reuse the catalog, including offline. Missing preferred-language text falls back to English; genuinely missing English keys still fail registration and roll back the owner. Step keys name their subject rather than their position.

## Visible Highlight Geometry

Highlights use the visible intersection of the target, its clipping or scrolling ancestors and the visual viewport. Page targets avoid the site header and footer; guides targeting those controls still use their own full area. An oversized target that is already visible keeps its scroll position. Callouts try available sides before moving inside the visible target, where misleading offscreen arrows are hidden. Tutorial controls reserve their own space so long translated copy scrolls without covering navigation buttons.

The independent shared floating menu keeps its standard theme, border, buttons, padding and backdrop blur. It sits above the tutorial shade, including the page-header replay chooser. The shade excludes the target, floating controls and broadcast banners; callouts reserve space below visible banners. Controls remain within the viewport in light and dark themes.

Tutorial text describes available tasks and controls without unrelated reassurances about permissions or actions the guide does not perform.

## Page Readiness

The host runs `page:ready` after `page:mounted`, with `prepare`, `blocking`, `ready` and `afterReady` stages. Rendering completes while the blocking stage awaits startup work. Deferred login setup joins this stage before release notes. The Changelogs owner awaits its preferences, metadata request and popup dismissal before readiness is published. Cancellation closes an obsolete popup without recording acknowledgement. Automatic tutorials and header replays remain deferred until readiness; navigation invalidates the old page and late work cannot release the replacement.

Future popup owners can append a staged blocker with `registerPageReadinessBlocker` from the shared `page-readiness.js` module before the page is mounted. Pass an owner-unique `id`, optional `order` and owner `signal`; return the promise that resolves when the check or popup finishes. The callback receives `input.signal`, combining page and owner cancellation. Registrations replace safely and dispose with their owner. Consumers use `ui:pageReadiness.isReady()` or the `afterReady` stage to defer non-blocking notifications and other page actions.

## Dashboard Panels And Actions

The Dashboard walkthrough has up to 18 steps and deliberately opens the notification pane and account dropdown through their real click handlers. Click exercises suppress hover, while the pane and menu explanations keep destructive or navigational actions inactive. The account guide explains Settings, Documentation, role-specific administration links and Logout. It also covers the page-action dock, language switching, appearance and layout editing.

Transient surfaces publish their element, close operation and owner signal through `ui:transientSurfaces.register(element, close, signal)`. A guide uses `attachLifetime(element, groupSignal)` to release only the matching finder, notification pane or dropdown when its group ends. Tutorial action clicks do not reach background click-away handlers, so menus remain open throughout their explanations.

Missing controls configured with `missing.action: "skip"` are omitted on first visits as well as replays, including role-hidden menu entries.

Step paths support `minRole`, a synchronous `when({ firstTime, completed, skipped, targetAvailable })` boolean predicate, and `dependsOn: ["earlier-step-id"]`. Unauthorized and false-condition stages are excluded from progress. Dependencies must reference earlier stages; unknown, duplicate, self and forward references are rejected. Interaction stages satisfy dependencies only after their event or wait condition succeeds; manually choosing Next skips their dependent branch. Static stages satisfy dependencies with Next. Outcomes passed to conditions are immutable snapshots. Counts reflect the currently eligible path and can expand after an interaction opens a branch. Back rewinds outcomes from its destination; `restart()` and the Restart Tutorial action reset all outcomes and release transient surfaces without replacing the session. The Dashboard Search, notification and account branches require opening their respective controls. Administration requires `minRole: "admin"`; optional dock controls have visibility conditions. Dock highlights follow the live dock bounds, including controls below the footer boundary, while callouts keep their reserved viewport.

Broadcast-banner buttons, links and keyboard activation remain available throughout a tutorial. Activating a banner action yields the tutorial through `ui:tutorial:priority` before any action-owned popup or navigation. Banner focus targets participate in keyboard traversal.

Search overlay steps use the overlay viewport, so shell headers and footers do not clip the search input highlight. Clicking any refinement pill completes the filter exercise. Steps requiring Next (or Finish) use a breathing animation without a permanent outline; reduced-motion preferences disable it. Waiting and automatically advancing steps do not show this cue.

Each tutorial step now explicitly declares `highlightNext`: explanations that require Next or Finish enable it, while interaction- and wait-driven exercises disable it. Reduced motion disables the animation; normal keyboard focus remains visible. All existing tutorials were reviewed for this distinction, including search results and notification explanations.

The optional boolean `highlightNext` defaults to `false`; the host never infers it from the step’s interaction or wait condition. Set it explicitly in the step definition. Enabled cues appear after preparation and respect reduced-motion preferences.

Back from outside a completed step group or dependency branch returns to its opener and clears its outcomes. Back within a branch remains sequential. This avoids revisiting a closed Search panel and automatically skipping to the exit.

Page steps can declare `targetMatch: "first"` to select the first visible, usable match inside their declared section. The default remains unique matching. Missing or disabled targets are skipped according to the authored policy. Action-specific highlights now point to editable power switches, role selectors, quota fields, notification tests, share controls, records and module actions. Components uses an editable displayed power switch; required and hidden controls are excluded.

Restart Tutorial is available after the first visible step; the tutorial no longer renders a Retry button. UI-facing introductory steps now highlight their referenced regions, including empty Jitsi meeting lists and Find Participants. Learning providers use published Study language targets and the public workspace target. Explicit `highlightNext` remains enabled on explanatory steps and disabled on event-driven stages.

Floating menus use the version-one `ui:floatingMenus` capability and the staged `ui:floatingMenu:request`, `present`, `dismiss` and `release` flows. Equal priorities queue in request order; higher priorities suspend lower menus. A lease exposes `ready` (first grant or cancellation), `present(element, { visible })`, `dismiss(element)` and `dispose()`. Tutorial sessions reserve priority 100 until completion, cancellation or owner removal, including between steps. Composer slots and replay choosers use the same queue. Aborted requests and stale presentations cannot replace newer menus; empty slots yield and page teardown removes observers and reservations.

Dock callouts retain visible control anchors below the menu reservation and avoid the actual floating action menu. The replay step highlights the ? button itself. The button retains the theme text color during tutorials while replay is guarded against replacing an active guide.

Completion belongs to the stable account and owner/tutorial ID. Content and package updates never reset it. A completed tutorial runs again only when requested through the page-header ? control. Preserve IDs when revising guides; completion remains in the account’s browser storage. Every successful session records completion before page discovery resumes, including guides started directly through a provider’s public handle.

Restart Tutorial appears after the first visible step. Replays offer Skip before the last visible step; the last step offers Finish. A one-step guide offers neither Restart Tutorial nor Skip. First-time guides continue to omit Skip throughout.

The ? button sits in line with the page title. It has no hover tooltip and retains its localized accessible label.

Target loss during asynchronous rendering is retried before readiness is published. Restarted or cancelled presentations cannot resume stale recovery or strand the floating menu.

`scope` bounds targets and discovery. Optional `visibleWhen` requires a unique visible element without restricting targets to its descendants; targets still stay inside the component root. Library Administration uses this for its browser visibility while highlighting sidebar search. Invalid selectors fail registration and roll back the owner.

## Reliable Walkthroughs

Bind discovery to the active view, not just its URL. Same-URL tabs, selected decks, content layers and dialogs need visible component-owned markers. `scope` must contain every scoped target; use `visibleWhen` when a sidebar control is outside the content section. A composer element ID is layout metadata, not a guaranteed DOM ID. Target actual feature markup. For styled switches, highlight the visible label rather than the hidden input.

Only one guide starts automatically for a visible surface in a browser session. Finishing it does not queue the other eligible guides; they remain available through ?. Changing the visible section can discover that section’s guide. Set `automatic: false` for supplemental introductions. Keep stable completion IDs, and never route an Explore visitor back to an overview merely to start a tutorial. Language introductions match the Study overview; the host owns activity walkthroughs.

Follow visual UI order unless an interaction dependency requires otherwise. Every stage must focus a distinct control or region. Combine redundant explanations instead of highlighting the same area again. Explain user goals and outcomes. Do not advertise Save/Discard or Review Changes when nothing can be staged. Cover empty calendars, empty lists, optional controls, roles and unavailable features explicitly.

`targetMatch: "first"` retains its selected connected element for the mounted contribution; hover-driven candidate reordering must not move a guide to another card. Initially absent targets follow the authored missing policy. A target lost after presentation instead keeps the current controls, waits up to fifteen seconds for restoration and then remains manually escapable with Next or Restart. Scrolling must not silently complete the guide.

Interactive detail branches use `interaction: "target"`, `suppressHover`, an event gate, `group`, and `dependsOn`. Next before opening skips the branch. A step’s optional `popup` selector permits only the expected feature-owned popup; unrelated dialogs still interrupt. Page contributions may declare `portal` for a target rooted in that explicitly selected same-document surface. The owning page must remain available. Bind popup dismissal to `groupSignal` so Back, Restart, Finish, navigation and owner removal release it. Keep passive detail explanations above their popup with `layer: "overlay"` and prevent their controls from mutating data.

The shell closes the account dropdown in the tutorial-start validation stage, including direct provider starts. Readiness blocker ownership lives in `ui:pageReadiness.registerBlocker(options, handler)`, shared by bundled and directly imported consumers. Use that method or `registerPageReadinessBlocker`; replace by owner ID and preserve replacement-safe abort cleanup. Do not keep competing module-local registration maps.

Verify actual rendered targets and progression through public contracts in source and production builds. Cover direct and repeated SPA mounts, same-URL section changes, empty and populated data, scrolling/reflow, hover, optional controls, role loss, branch skipping/Back, restart, owner removal and popup dismissal. Check current visible step counts and menu handoff. Keep browser/demo checks temporary; retain shared automated helpers. Feature changes must review affected guides, translations and component-owned coverage docs together.

Trusted enter/waitFor callbacks receive the public ctx alongside their lifetime signals. Obtain shared behavior through its capabilities. Feature popups register their element, owner close operation and signal through ui:transientSurfaces; detail branches attach groupSignal through that contract rather than querying popup-private buttons.

Popup portal targets resolve only within an active expected modal. Closing overlays may remain connected for their exit animation; they must not supply a later branch’s target or optional-control count. Verify rapid Back, reopen and Restart in production builds as well as source builds.

Conditions receive targetAvailable as an immutable boolean resolved through the stage’s declared, owner-authorized target. It is false for a missing, hidden, disabled or inactive portal target. Use it for optional actions instead of inspecting another component’s modal classes.

Restart Tutorial is the first action in the floating menu and uses btn-cancel styling. It remains hidden on the first visible step.

Check targets against the rendered UI in both populated and empty states. A selector must identify one visible, concrete region; distinguish repeated sections with owner-defined semantic markers and keep highlights fitted to their controls. Omit unavailable optional actions from the step count. Explicitly enrolled languages alone receive language-module guides; a direct visit does not establish enrollment. Use interaction branches for opening details and settings, with Next bypassing unopened branches and Back returning to their start. When an owner prevents a native click default, an explicit advance.accept callback must validate the resulting state. Keep each explanation useful: say what the user can do and what happens, rather than describing implementation safeguards. Tutorial chooser actions use the same motion-aware breathing cue as Next.
