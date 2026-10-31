# Guided Tutorials

Tutorials is available from the account menu. It lists the plays currently permitted by installed components and modules. The host supplies presentation, target resolution, interaction policy and session coordination; each feature owns its text, targets and script. No tutorial runs automatically or changes permissions.

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

## Targets And Localization

Target names become `owner:name`. Targets are private unless explicitly published with `public: true`; cross-component consumers use the returned semantic ID, never private selectors. Duplicate owner, play and target IDs are rejected. A resolver returns exactly one same-document element or `null`; publish resolvers rather than retained page nodes. Optional `root` restricts resolution and `signal` can shorten a target's lifetime. Hidden, inert and disabled targets are unavailable. Withdrawing a target cancels a session currently using it.

Resolvers are re-evaluated after replacement and while the view is active. Open Shadow DOM targets are supported when the declared root includes their host. Closed roots and frame contents are unsupported. Embedded elements cannot be used in a blocking target or its descendants because the host cannot enforce their input policy. Portals require an explicitly published same-document root.

`stringsBaseUrls` uses the host's localized catalogs and English fallback. Catalog reads and replay resolve the current displayed language, without refreshing the page. A contributor can alternatively supply `i18n`, either a resolver or an asynchronous resolver factory. Missing required translations reject registration or the operation. All owner text renders as plain text; HTML strings are never interpreted.

## Step Options

- `effects`: independently enable `callout`, `arrow` and `spotlight`. Callout defaults to true; the others default to false. Explanatory text stays accessible when visually hidden. Controls and progress remain available.
- `placement`: `auto`, `top`, `bottom`, `left` or `right`; `padding` is 0–40 pixels. Placement tracks nested scrolling, resize, layout changes and the visual viewport. Initial off-screen targets are scrolled into view; later deliberate scrolling is respected.
- `interaction`: `free` or `target`. Blocking restricts pointer, touch and keyboard activation to the target and tutorial controls. It does not enable disabled controls or replace authorization.
- `advance`: a `click`, `change`, `input`, `submit` or `keydown` event, optional keyboard `key`, and optional synchronous/asynchronous `accept(event)` predicate. Repeated input advances once. An async predicate must resolve to `true`.
- `enter({ signal, target, stepId })`: trusted setup callback, optionally returning a cleanup function. `waitFor` receives the same context and advances on fulfillment. Both are bounded to fifteen seconds and cancelled with the step. Async cleanup failures are logged; owners should cancel their asynchronous work through the supplied signal.
- `route`: a same-origin path without query data, or a trusted callback resolving such a path. Navigation uses `ui:navigate` and preserves its authorization, offline and unsaved-change decisions. Route callbacks let feature owners resolve their own navigation; Study exposes this through `study:tutorialTargets.route({ language, area })`, where area is `overview`, `explore` or `flashcards`.
- `missing`: `timeoutMs` from 0 to 15000, default 5000, and `action` of `cancel`, `skip` or `retry`. Skip advances past the missing step; retry presents an explicit Retry control. Waiting never locks the page.

Definitions declare version 1, unique step IDs, localized title keys and at most 100 steps. Unsupported versions, unknown fields and malformed options are rejected. Callbacks are trusted component code; never compile or evaluate downloaded script strings.

## Sessions And Flows

`await owner.register(play)` returns `{ id, start, dispose }`. `await tutorials.list()` reads the current permitted catalog; `openCatalog()` uses the existing decision popup and coalesces repeated requests. `await tutorials.start(id)` or the play's `start()` returns a session with `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()` and `dispose()`. `current()` is a read-only snapshot. Skip ends the play; cancellation and cleanup are idempotent.

Only one session is active. A competing start rejects unless `{ replace: true }` explicitly cancels the current one. Registration, target publication, catalog reads/opening, start, next, back, retry, skip and cancel run through `ui:tutorial:<action>` flows with `validate`, `execute` and `after` stages. Page and module code must not bypass these capabilities.

Unrelated navigation, browser Back/Forward, Escape, permission loss, owner removal and required popups cancel the session. Explicit route steps may continue through an accepted SPA transition. A pending navigation always has visible cancellation controls. The tutorial never confirms a dialog, submits a privileged form or initiates a call. Existing mandatory dialogs take precedence and retain their dismissal policy.

Completion and cancellation remove host overlays, input listeners, observers, timers and pending target waits, then restore focus when appropriate. Late callbacks cannot restore an old step. Module disable, uninstall, update and failed provider mounting dispose the owner's definitions and affected sessions. No completion state is persisted; consumers may observe `cognis:tutorial-presented` and `cognis:tutorial-finish` without adding storage to the engine.
