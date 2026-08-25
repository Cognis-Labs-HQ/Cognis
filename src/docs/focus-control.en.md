# Focus Control

## Manifest schema

Pages declare `pageManifest.focusControl`; individual composer elements may declare the same property. A surface has stable `id` and `pageId`, localized `labelKey` and `descriptionKey`, a declared `route` or `module-route` loader, `overlay` and/or `fullscreen` modes, a synchronization flag, and JSON state. Loader callbacks and HTML are never accepted from messages.

## Flows and providers

The `declare`, `authorize`, `start`, `load`, `publish`, `apply`, `transfer`, and `end` flows separate policy, transport, and rendering. Collaboration providers contribute `focus:session-provider` on the server and `focus:transport` in the browser through ctx. Hooks are removed when their component is disabled.

## Security and synchronization

Providers authenticate every request, scope it to a collaboration resource, validate membership and role on every mutation, limit state to 64 KiB, and use monotonically increasing revisions. Current authoritative state is returned for reconnecting and late-joining clients; stale and duplicate revisions are ignored.

## External module example

An external whiteboard declares a `module-route` loader with its discovered module ID and route ID. Its Focus state contains only the stable whiteboard resource reference and presentation metadata; document updates continue through its own gateway.

## Component page eligibility

An external module page is unavailable to other components unless its bootstrap registers the SPA route with `componentPage`. The declaration must provide lowercase localization keys in `labelKey` and `descriptionKey`, plus at least one supported mode (`overlay`, `fullscreen`, or `pip`). Cognis attaches the module UUID from its verified manifest; modules must never supply or infer another module's filesystem path or script URL.

Use periods as word separators in every new localization key (for example, `module.example.canvas.label`). Do not introduce underscores or hyphens between words; only an already-registered hyphenated module ID may retain its hyphen inside the module namespace segment.

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas.label",
        descriptionKey: "module.nextcloud-whiteboard.canvas.description",
        modes: ["overlay", "fullscreen"],
    },
});
```

The page entry module must export `mount(root, { signal, focusState })`, honor the abort signal, render only inside `root`, and accept serializable caller context through `focusState`. Declaring eligibility exposes presentation only; the providing module remains responsible for authorization, resource creation, participant access, persistence, and live document synchronization.

## Requesting another component page

A requester identifies the provider by immutable manifest UUID and its stable route ID. Browser code obtains `component-pages:request` from `uiCtx.capabilities`; it must not import the provider or construct its asset URL. The capability returns `null` when the module is disabled, inaccessible, missing, or has not opted the route into component use.

```js
const requestPage = uiCtx.capabilities.get("component-pages:request");
const page = await requestPage?.({
    componentUuid: WHITEBOARD_MODULE_UUID,
    routeId: "whiteboard.canvas",
    context: { meetingId },
});
```

`component-pages:request` only checks availability and never mounts UI. To open a component window, obtain `component-pages:spawn` and call it synchronously from the Whiteboard button's click or keyboard activation handler. Pass the ID of an existing caller-owned stage and the page `AbortSignal`. Cognis requires active user activation, creates a paint-contained window inside the stage, blocks link and form navigation from escaping into the dashboard router, and passes `navigationAllowed: false` to the provider.

The spawn capability returns a handle with `discard()`. The caller must discard the handle when its close or back control is used; Cognis also discards it when the caller's signal aborts or before the SPA router mounts another page. `component-pages:discard` accepts the stage ID for callers that do not retain the handle, and `component-pages:discardAll` is available to shell lifecycle coordinators. Discovery during meeting-page mount must use only `component-pages:request`: calling the spawn capability during discovery is invalid and prevents the Whiteboard button from being the user's explicit opening action.

The stage ID may contain only letters, digits, dots, underscores, colons, or hyphens. The provider must render only inside the supplied root, honor the signal, return a cleanup function or an object exposing `destroy`/`unmount` when it owns additional resources, and avoid direct history, location, router, anchor, or form navigation while embedded.

For synchronized Focus Control, declare a `module-route` loader whose `moduleId` is that UUID and whose `routeId` is the eligible route ID. A collaboration provider must still authorize the request, create or resolve the whiteboard through server-side ctx capabilities, grant meeting participants access, and publish only stable resource identifiers through `focus:transport`.

## Borderless component windows

Pass `borderless: true` to `component-pages:spawn` when the embedded page must touch every edge of its caller-owned stage. Cognis removes the component window's outer margin, padding, border, and radius, sizes it and its direct content root to the full parent, and forwards `borderless: true` to the provider mount options. Internal content spacing remains the provider's responsibility.

While a borderless component is mounted, Cognis also removes the outer margin from the containing `.app-page__main`. The normal page margin is restored automatically when the last borderless component in that page is discarded.

Component windows do not create an independent vertical scroll area. Their stage and window remain in normal flex layout and grow with the embedded content, while wheel input over the component continues scrolling the main page. This keeps a single page-level scroll position regardless of pointer location.

## Built-in component pages

Authenticated dashboard pages shipped with Cognis use the Cognis Core UUID `b4d49c4a-61d0-5db2-84fd-f89b80fd6398`; Study uses its gateway UUID `338b9237-a2c8-5bcf-9437-bccc9abd9a27`. Their stable route IDs are `core.dashboard`, `core.settings`, `core.users`, `core.invite`, `core.modules`, `core.administration`, `core.docs`, `core.changelogs`, `core.license`, `core.error`, `gateway.study`, and `gateway.study.child`. They use the same `component-pages:request` contract as external modules and support overlay or fullscreen embedding. Login and demonstration entry points are not dashboard-shell component pages and are not eligible.

## Movable and resizable PiP windows

A surface that declares `pip` is presented through Cognis' reusable floating-window behavior. Each floating window includes a thin host-owned toolbar that can be dragged from anywhere along its top edge and a visible SVG resize handle in its lower-right corner; Cognis keeps the window within the visible viewport and releases all listeners when the focus session ends. Provider modules normally only declare `pip` and mount into the supplied root. A module that owns a separate PiP element, such as a meeting frame, can obtain `ui:makeFloatingWindow` from `uiCtx.capabilities`, pass its element, drag handle, and page signal, and retain the returned cleanup function. Modules must not import the utility directly or install competing document-level drag or resize handlers.

Cognis promotes the existing provider element to the browser top layer without moving it to another DOM parent. This keeps live iframe and meeting connections intact when PiP opens or closes. Browsers without top-layer support keep the element in its original component stage and constrain it to that parent rather than reparenting it.
