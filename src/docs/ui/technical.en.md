# Technical Reference

The public interfaces and operational rules of UI.

## Interfaces

UIRegistry publishes static directories, navbar plugins, administration sections and page extensions. Browser providers register capabilities through uiCtx and own their cleanup signal; page contributions render through the shared Page Composer.

## Configuration

Account preferences select theme, language and font. Component catalogs supply their own translations and page metadata; layout options remain in Page Composer instead of per-feature shell overrides.

## Behavior

Connection recovery invalidates core and component translation snapshots before pages redraw. Explicit bundle refreshes fetch current server content while retaining complete offline snapshots during outages. Non-resource XML responses fail validation and are evicted so a subsequent load can recover without a hard refresh.

### Overview

`src/ui/` hosts the Cognis browser frontend. It provides the study workflows, social interaction surfaces, administration panels, and the embedded documentation browser. The UI is a server-rendered multi-page application: each page is an HTML file with its own JavaScript entry point; shared layout shells and reuse utilities keep common behaviour consistent across pages.

The UI layer has no knowledge of which gateways or adapters are installed. Instead, gateways contribute UI elements at runtime through the `UIRegistry` and the page-extensions API. The core pages load only what the server reports as available for the current user, so the frontend remains coherent whether or not optional gateways like profile or notify are enabled.

All user-visible text goes through the i18n system defined in `src/ui/reuse/i18n.js`. No copy is hardcoded in JavaScript or HTML templates. Automated tests in `src/ui/tests/hardcoded-strings.test.js` enforce this at CI time.

### Responsibilities

- Host all page entry points and their associated HTML templates.
- Provide the layout shells (`ui/layouts/`) that all non-login pages render through.
- Maintain the reuse utilities (`ui/reuse/`) for i18n, page composer, unsaved-change guards, and other cross-page behaviour.
- Enforce theme parity: every element resolves its colors from CSS variables, never hard-coded hex values.
- Provide the i18n string packs for all four required languages (en, de, ja, id) at `src/ui/languages/`.

Not responsible for: generating API responses, owning authentication logic, or injecting gateway-specific UI — gateways contribute their own sections via `UIRegistry`.

### Directory structure

| Path                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `src/ui/layouts/`          | Shared HTML shells that page entries render inside     |
| `src/ui/public/templates/` | Reusable markup fragments                              |
| `src/ui/public/pages/`     | Per-page HTML files served to the browser              |
| `src/ui/app/`              | Page entry point JavaScript modules                    |
| `src/ui/reuse/`            | Cross-page utility modules (i18n, page composer, etc.) |
| `src/ui/styles/`           | CSS: base tokens, layout, page-specific rules          |
| `src/ui/languages/`        | i18n string packs (en, de, ja, id)                     |

Each page entry point lives in its own subdirectory under `src/ui/app/` as `index.js`. Sub-modules for that page sit alongside `index.js`, dropping any shared prefix (e.g. `settings/font-prefs.js` rather than `settings-font-prefs.js`).

### Page composer

The `createPageComposer` utility in `src/ui/reuse/page-composer/init.js` handles widget grid layout, persistence, sub-page navigation, toolbar slots, and floating menus. Pages declare an array of `elements` with `id`, `label`, `render`, and optional `gridSize`; the composer handles everything else. See `src/docs/page-composer.en.md` for full API reference.

### UIRegistry

Gateways inject admin panels, static assets, and per-page UI contributions at runtime through the `UIRegistry` (`src/api/reuse/ui-registry.ts`). The `GET /api/v1/ui/page-extensions/:pageId` endpoint returns elements contributed by all enabled gateways for the named page. The `GET /api/v1/admin/sections` endpoint returns gateway-contributed admin UI sections.

### State model

- The bearer token and account ID are stored client-side after login.
- Page layout preferences are saved via `PUT /api/v1/social/users/:accountId/preferences/:pageId`.
- The auth token is also available in the `cognis_access_token` HttpOnly cookie for server-rendered route guards.

### Theme coverage requirement

Every HTML element added to templates or injected from page scripts must resolve its visual colors from CSS theme variables defined in `src/ui/styles/reuse/theme.css`. Hard-coded hex or rgb values are a policy violation. Both `light` and `dark` modes must remain readable, including hover, focus, disabled, and active states.

### i18n key conventions

| Prefix               | Use                                                              |
| -------------------- | ---------------------------------------------------------------- |
| `ui.reuse.*`         | Labels shared across multiple pages                              |
| `ui.reuse.generic.*` | Context-free standalone action words (save, discard, reset, add) |
| `ui.app.<page>.*`    | Page-specific copy                                               |
| `ui.layout.*`        | Layout shell text and ARIA labels                                |
| `ui.page.title.*`    | Document `<title>` values                                        |
| `module.<id>.*`      | Module-owned strings loaded on demand                            |

### Reusable Image Previews

Global `ui:imagePreview` provides thumbnail rendering, binding and an `open` action through the registered `ui:imagePreview:open` flow. It is also available from `ui:reuse` as `image-preview.js`; its provider loads the shared stylesheet before publishing controls. Image buttons open the original image at its natural size, constrained to the viewport, with only the standard X control visible. Keyboard activation, Escape, focus return and owner/provider teardown use the shared popup lifecycle. Callers retain ownership of image URLs and optional removal actions. Library uses this shared control for uploaded and bundled images in editors and detail galleries.

The shared image-preview provider loads its stylesheet before publishing controls. The image-only popup removes heading markup and fits landscape, portrait and panoramic originals inside the viewport without horizontal or vertical scrolling. Library detail previews retain their 20rem × 18rem limits; editor thumbnails remain 8rem × 6rem.

### Responsive Session Navigation

Logout clears private session data without waiting for public service-worker route maintenance. Identical worker policy requests share one exchange without merging changed access decisions. The language switcher waits for its catalog provider and hides account-only controls when signed out. Bundled and directly served router copies share document state, listeners and mount cancellation, including Settings to Dashboard navigation.

### Quiet Marketplace Polling

See the [shared contract](/docs/api/technical) for this behavior.

### Cancel Before Submission

The shared UI offline client carries a caller’s AbortSignal through registered request stages, pending-queue reads and delivery waits. Cancellation before a network request or durable queue write starts prevents that new action. The outbox checks cancellation again inside its storage lock.

The additive contracts are `deliverOrQueue(ctx, owner, id, payload, send, { signal } = {})` and `outbox.submit(owner, id, payload, { signal } = {})`. Existing callers without a signal and durable replay keep their behavior. A later abort never removes an accepted queue record or undoes a request already sent; a lost acknowledgement may leave an uncertain result and must not invite blind resubmission.

These contracts belong to shared UI assets, not a gateway or adapter package. Ship the updated shared assets with Profile 4.0.1. Profile, Messages, Calendar and Notify email use the shared HTTP client; Study drawing, library, favourites and Flashcards also use the optional delivery helper. Their no-signal calls keep the existing contract. No Calendar runtime behavior is customized.

### Search Selection Contract

Select a result with the pointer or Enter and wait for its action to finish. Each popup permits only one selection callback while pending. While Search’s owner remains active, a thrown error or rejected promise keeps the query, category and multi-selection intact and shows a localized toast. Check the destination before retrying: failed feedback does not prove that an operation was not dispatched. An unavailable result asks you to search again.

`openSearchPopup` and `createSearchBar` accept an optional `signal` and pass a selection context as the callback’s second argument, including `context.signal`. Synchronous callbacks and successful `undefined` returns keep their existing behavior; promises are awaited before successful dismissal. Strict `false` is an additive cancellation result that keeps Search open without an error while its owner remains active. Footer actions use native `click` activation, including keyboard and browser activation; `mousedown` does not invoke the selection callback.

Close, Escape, route or page teardown, provider lifetime ending and account changes invalidate pending UI settlement. Unregistering a result provider invalidates selections it owns. A stale completion cannot close a replacement popup or show late feedback, but cancellation cannot undo an already dispatched operation. Callers must pass their owner signal and honor the callback signal before dispatching work.

Navbar selection propagates `navigateTo` returning `false` before route teardown, preserving Search without an error when navigation is refused. Once `route-will-change` or `pagehide` fires, Search is dismissed as lifecycle cancellation even if the destination later fails to mount. Outcome feedback then belongs to the destination or router, not the dismissed Search popup.

The workspace tutorial explains selection, waiting and safe retry while preserving its targets, completion IDs, Next, Back and replay. Search is shared UI without an independently versioned package or manifest.

### Form Validation

Fields evaluated as invalid expose `aria-invalid="true"`. Their `aria-describedby` includes the existing localized criteria that are currently unmet, alongside any descriptions supplied by the caller. Correcting a field removes only the builder's invalid state and description references. Untouched controls and indeterminate (`null`) criteria do not acquire an invalid ARIA state before evaluation. Existing required, optional and validation-return rules still apply; native constraint validity and tab selection are separate from custom criteria.

Each rendered criterion has a unique ID, including when multiple forms use the same field names. The controller's `detach()` and the attachment's abort signal remove owned event listeners and ARIA state; explicit controller validation remains available. Page and popup owners must end the attachment when their form lifetime ends. No field values are recorded by this presentation behavior.

Caller changes to `aria-invalid`, including removal, are retained across later invalid checks and correction or cleanup. A caller writing the same `true` value is indistinguishable from the builder's existing value. If a custom criterion ends the attachment, the interrupted field or whole-form evaluation still returns its validation result but does not update presentation after cleanup. A deliberate validation call after cleanup starts a new evaluation and can be cleaned up again.

### Tutorial coverage

Follow the requirements shown for a field, correct unmet criteria and retry the owner's action. Registration administration and Security tutorials retain their existing controls, targets, completion IDs and navigation. The Security guide already explains meeting password requirements, confirmation and cancellation. Shared validation adds no new tutorial action or step. The shared UI has no independently versioned package or manifest.

## Security

Hidden navigation is not access control. Browser providers resolve owner capabilities and abort pending work on unmount or account changes; private reads remain account-scoped.

## Reference

### Guided tutorials

Tutorials belong to a page or URL. The first eligible visit starts the page’s unseen tutorials automatically. A question-mark SVG beside the title in `page-context` replays tutorials available on that page. The host owns presentation and lifecycle; each feature owns its text, targets and script. Tutorials never change permissions.

`showToast(message, { minRole: "admin" })` limits operational feedback to administrators and owners. Other or unknown roles receive no toast DOM, timers or dismissal callbacks. Omitting `minRole` keeps normal feedback available to everyone. This client presentation option does not authorize server operations.

Floating menus use the version-one `ui:floatingMenus` capability and the staged `ui:floatingMenu:request`, `present`, `dismiss` and `release` flows. Equal priorities queue in request order; higher priorities suspend lower menus. A lease exposes `ready` (first grant or cancellation), `present(element, { visible })`, `dismiss(element)` and `dispose()`. Tutorial sessions reserve priority 100 until completion, cancellation or owner removal, including between steps. Composer slots and replay choosers use the same queue. Aborted requests and stale presentations cannot replace newer menus; empty slots yield and page teardown removes observers and reservations.

Toast feedback loads its shared stylesheet without delaying notification creation or dismissal. Concurrent notifications share a loading cycle with at most two five-second attempts. A failed cycle permits a later notification to retry. Existing external links are preserved; only failed links created by the toast loader are removed. Dismissal during loading remains final. Page tutorial targets and progression are unchanged.

### Keyboard Popup Navigation

Every popup has its own accessible heading, including nested unsaved-change confirmations and multi-page dialogs. Tab and Shift+Tab stay inside the active dialog. Keeping a draft returns focus to its editor; closing the last dialog returns focus to its available opening control, or to the page when that control is gone. Empty dialogs keep focus until controls become available. Navigation cancellation releases popup focus ownership without moving focus back onto the old page. Closing animations do not retain keyboard ownership. These shared controls also apply to dialogs opened from guided tutorials.

### Popup Action Contracts

Enter and Space activate the focused native control, so choosing Cancel never selects another footer action. The unsaved-changes dialog initially focuses safe Cancel; Discard uses danger styling. Holding Enter does not repeat popup activation. A pending action cannot be submitted again; explicit Close and Cancel remain available, and stale or closing controls cannot invoke callbacks.

Plain Enter in a single-line text, search, email, URL, telephone or password field outside a native form uses the first available footer action declared with `variant: "confirm"`. The current action descriptor supplies this constructive outcome; CSS classes and action IDs do not grant default authority. Callers must classify destructive outcomes as `cancel` and safe dismissal as `neutral`. Native form submission, buttons, links, textareas, editable content, selects, composite widgets, modified keys and IME composition keep their own handling. Disabled, hidden, inert and removed controls are ineligible.

Initial and switched-page footers render native `button type="button"` controls with exactly one shared consequence class. Neutral actions, including Done, retain popup-specific neutral appearance and participate in shared wrapping and touch-target styles. Pages may add or remove a footer, and replacement body actions use the same callback lifecycle. Existing tutorial targets, labels, completion IDs and replay behavior remain unchanged; tutorial Next and Back retain their own keyboard actions. The shared host popup has no independent component version or manifest.

Registered body completion controls may be deliberately hidden and activated programmatically, as in email verification. They never become keyboard defaults and still obey enabled, inert, pending and popup-lifetime checks.

Form-builder dialogs with `includeSubmitButton: false` declare `data-form-submit="external"`. Their fields may use the constructive footer action, whose callback retains validation responsibility. A native submit button or image input associated with that form takes precedence, including controls outside the form element.

### Scoped Tutorial Focus

The additive `ui:popupFocus` capability coordinates popup owners through `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })`, and `restore(overlay, preferred)`. Registration belongs to the popup renderer. A tutorial delegates only the exact active popup accepted by its current step; the delegate supplies its allowed targets and controls, connected same-document surfaces, and focus callback. The required abort signal, removal of a delegated surface, or popup dismissal revokes the delegation. A newer popup keeps exclusive focus, including before its opening animation. Closing or replaying a tutorial restores ordinary popup keyboard handling without reopening a dismissed page. The `openPopup` options remain unchanged.

The required `onRevoke` callback removes delegated event handlers synchronously before focus is returned.

Delegated callbacks are synchronous, and `contains` must return a boolean. A thrown error, invalid predicate value, asynchronous return, or recursive focus attempt revokes the delegation, records safe diagnostic metadata, and restores ordinary popup focus handling. Callback and logging failures cannot interrupt popup dismissal or leave its result pending.

### Language list gestures

Drag a language row, or its handle on a touch screen, into the preferred list at the desired position. Drops on a row insert before or after its midpoint; drops in the remaining table area append. English stays available as a preferred fallback. Changes remain a draft until Save; Discard restores the saved order. Offline mode permits reordering preferred languages but not changing membership.

Settings native dragging and touch/pen handles share `bindListDropzones` in `src/ui/app/settings/dropzones.js`. The Settings controller owns selectors, eligibility and the drop callback; the helper owns destination hit testing, indicators, capture and cancellation. `cancel()` clears a gesture before rerender; `dispose()` or the supplied signal removes its listeners. Cancellation, lost capture, Escape, leaving the page and invalid drops do not submit edits. Eligibility failures release the gesture before propagating; capture release cannot commit after cancellation, owner disposal or row replacement. The Settings language tutorial retains its available/preferred list targets and explains the same drag and Save workflow.

### Message Style Preview

Appearance shows a labeled, fictional conversation below Message Style. Incoming and outgoing samples use the Messages presentation with participant labels and localized dates and times. Switching the style previews the unsaved choice; Save applies it and Discard restores the saved layout. The appearance tutorial includes the preview only while it is available. The sample has no links, profile actions, receipts or real conversation data. If Messages is unavailable, the selector and ordinary preference workflow remain usable. Repeated section renders retain pending choices, and leaving Settings cancels unfinished rendering.

Message Style previews require a ready version 2 presentation provider. If Profile or Messages becomes unavailable, only the sample is hidden; the selector and unsaved choice remain usable. The current choice reappears automatically when its providers recover. The optional preview tutorial step follows the same visible region. Deploy matching Settings, Messages 2.8.1 and Profile 3.0.19 assets together.

### Module Lifecycle Outcomes

Enable and Disable remain busy while the mutation request and any follow-up state check run. A state read establishes the current observed state, not whether this request committed. Leaving Modules does not cancel an already sent mutation, and its old page cannot show late feedback or update a replacement view. Account changes invalidate queued work and late results. A lost response triggers one fresh state read with a five-second deadline, never an automatic mutation retry. If the result remains unknown, Check State replaces lifecycle actions; later reads and SPA visits keep actions locked while the opposite state is observed; actions return only after the requested state is observed. Optional setup guidance and cancelled catalog refreshes cannot turn an acknowledged enable into a rejection. Required configuration cancellation still rolls back once. A lost rollback response is reconciled as disabled only when an authoritative read shows disabled; otherwise its outcome remains unknown.

The marketplace tutorials include Check State only when its enabled control is present, skip ordinary lifecycle actions while their result is unknown, and retain their existing owner and completion IDs. Configuration openings retain their existing popup and tutorial lifetimes. The Modules page is part of the host UI.

A reconciled lifecycle event is marked as observed-state, distinct from an acknowledged-response event. An observed state does not prove that this request committed. The API has no durable operation receipt: unresolved client ownership is retained across SPA mounts, not a full browser reload. After a reload only the current server state is available; the current state cannot establish the terminal outcome of the earlier request.

A module cannot satisfy a dependency while its lifecycle action is pending or its result is unresolved, including disable and setup rollback. Repeated actions and SPA mounts retain this restriction, and queued activations check readiness again when execution begins without repeating an optional-dependency choice. Observed enablement remains separate from completed setup; rejected rollback also leaves setup incomplete. Saving settings can confirm setup but cannot resolve an uncertain mutation. An authoritative expected disabled state permits ordinary explicit enable recovery.

Settings and update/channel actions use the same account-bound pending and outcome checks, including temporary enable/disable and rollback. Every enable and restoration rechecks selected dependencies. Installation restoration is permitted only after definite submission rejection or an acknowledged terminal job result. Lost submission or status responses and missing job receipts remain unknown, with no restore or retry. An installation with a lost result stays blocked for the page session: Check State refreshes the catalog but cannot establish job completion. A full reload discards this local uncertainty without proving completion; durable job receipts and recovery across full reloads are unavailable.
