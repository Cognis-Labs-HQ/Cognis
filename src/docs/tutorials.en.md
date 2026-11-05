# Guided Tutorials

Tutorials belong to a page or URL. The first eligible visit starts the page’s unseen tutorials automatically. A question-mark SVG beside the title in `page-context` replays tutorials available on that page. The host owns presentation and lifecycle; each feature owns its text, targets and script. Tutorials never change permissions.

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

Study exposes `study:tutorialTargets.matchesPage({ pathname, language })` so language providers can bind their tutorial to Study-owned Explore and Flashcards pages without copying host route rules. The composer publishes completed page mounts through `page:mounted` (`publish`).

## Targets And Localization

Target names become `owner:name`. Targets are private unless explicitly published with `public: true`; cross-component consumers use the returned semantic ID, never private selectors. Duplicate owner, play and target IDs are rejected. A resolver returns exactly one same-document element or `null`; publish resolvers rather than retained page nodes. Optional `root` restricts resolution and `signal` can shorten a target's lifetime. Hidden, inert and disabled targets are unavailable. Withdrawing a target cancels a session currently using it.

Resolvers are re-evaluated after replacement and while the view is active. Open Shadow DOM targets are supported when the declared root includes their host. Closed roots and frame contents are unsupported. Embedded elements cannot be used in a blocking target or its descendants because the host cannot enforce their input policy. Portals require an explicitly published same-document root.

`stringsBaseUrls` uses the host's localized catalogs and English fallback. Catalog reads and replay resolve the current displayed language, without refreshing the page. A contributor can alternatively supply `i18n`, either a resolver or an asynchronous resolver factory. Missing required translations reject registration or the operation. All owner text renders as plain text; HTML strings are never interpreted.

## Step Options

- `effects`: independently enable `callout`, `arrow` and `spotlight`. Callout defaults to true; the others default to false. Explanatory text stays accessible when visually hidden. Controls and progress remain available.
- `placement`: `auto`, `top`, `bottom`, `left` or `right`; `padding` is 0–40 pixels. Placement tracks nested scrolling, resize, layout changes and the visual viewport. Initial off-screen targets are scrolled into view; later deliberate scrolling is respected.
- `interaction`: `free` or `target`. Blocking restricts pointer, touch and keyboard activation to the target and tutorial controls. It does not enable disabled controls or replace authorization.
- `preventNavigation`: an optional boolean that blocks link activation and router navigation while the step is active, including history traversal handled by the router. It defaults to false. Tutorial-owned `route` transitions remain available. Progression and disposal release the guard. The Dashboard guide enables it so highlighting the navigation does not take the user away.
- `advance`: a `click`, `change`, `input`, `submit` or `keydown` event, optional keyboard `key`, and optional synchronous/asynchronous `accept(event)` predicate. Repeated input advances once. An async predicate must resolve to `true`.
- `enter({ signal, target, stepId })`: trusted setup callback, optionally returning a cleanup function. `waitFor` receives the same context and advances on fulfillment. Both are bounded to fifteen seconds and cancelled with the step. Async cleanup failures are logged; owners should cancel their asynchronous work through the supplied signal.
- `route`: a same-origin path without query data, or a trusted callback resolving such a path. Navigation uses `ui:navigate` and preserves its authorization, offline and unsaved-change decisions. Route callbacks let feature owners resolve their own navigation; Study exposes this through `study:tutorialTargets.route({ language, area })`, where area is `overview`, `explore` or `flashcards`.
- `missing`: `timeoutMs` from 0 to 15000, default 5000, and `action` of `cancel`, `skip` or `retry`. Skip advances past the missing step; retry presents an explicit Retry control. Waiting never locks the page.

Definitions declare version 1, unique step IDs, localized title keys and at most 100 steps. Unsupported versions, unknown fields and malformed options are rejected. Callbacks are trusted component code; never compile or evaluate downloaded script strings.

## Sessions And Flows

`await owner.register(play)` returns `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` reads permitted plays for that page. `refreshPage()` refreshes discovery; `openPage()` starts the only matching play or offers the matching plays in a shared floating menu. `await tutorials.start(id)` or `start()` returns `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()` and `dispose()`. `current()` is a read-only snapshot.

Only one session is active. A competing start rejects unless `{ replace: true }` explicitly cancels it. Registration, targets, discovery, page entry, replay, start and step actions use `ui:tutorial:<action>` flows with `validate`, `execute` and `after` stages. Consumers must not bypass these capabilities.

All tutorial action buttons live in an independent instance of the shared floating menu. First-time sessions have no Cancel or Skip action; Escape does not dismiss them. Next remains available during target waits, asynchronous work and event-driven steps, so repeatedly pressing it always reaches completion. Replays expose cancellation with `btn-cancel`. Unrelated navigation, history, account/access loss, provider removal and required popups still release every session. Tutorials never confirm dialogs, submit privileged forms or initiate calls.

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

[Tutorial Coverage](/docs/tutorials-coverage)

## Tutorial Catalogs

Tutorial locale catalogs are loaded under a revision of their declared translation keys, separately from earlier page catalog loads. This prevents an older in-memory catalog from rejecting newly published tutorial copy. Identical guide contracts reuse the catalog, including offline. Missing preferred-language text falls back to English; genuinely missing English keys still fail registration and roll back the owner. Step keys name their subject rather than their position.

## Visible Highlight Geometry

Highlights use the visible intersection of the target, its clipping or scrolling ancestors and the visual viewport. Page targets avoid the site header and footer; guides targeting those controls still use their own full area. An oversized target that is already visible keeps its scroll position. Callouts try available sides before moving inside the visible target, where misleading offscreen arrows are hidden. Tutorial controls reserve their own space so long translated copy scrolls without covering navigation buttons.

The independent shared floating menu keeps its standard theme, border, buttons, padding and backdrop blur. It sits above the tutorial shade, including the page-header replay chooser. The shade excludes the target, floating controls and broadcast banners; callouts reserve space below visible banners. Controls remain within the viewport in light and dark themes.

Tutorial text describes available tasks and controls without unrelated reassurances about permissions or actions the guide does not perform.

## Page Readiness

The host runs `page:ready` after `page:mounted`, with `prepare`, `blocking`, `ready` and `afterReady` stages. Rendering completes while the blocking stage awaits startup work. Deferred login setup joins this stage before release notes. The Changelogs owner awaits its preferences, metadata request and popup dismissal before readiness is published. Cancellation closes an obsolete popup without recording acknowledgement. Automatic tutorials and header replays remain deferred until readiness; navigation invalidates the old page and late work cannot release the replacement.

Future popup owners can append a staged blocker with `registerPageReadinessBlocker` from the shared `page-readiness.js` module before the page is mounted. Pass an owner-unique `id`, optional `order` and owner `signal`; return the promise that resolves when the check or popup finishes. The callback receives `input.signal`, combining page and owner cancellation. Registrations replace safely and dispose with their owner. Consumers use `ui:pageReadiness.isReady()` or the `afterReady` stage to defer non-blocking notifications and other page actions.
