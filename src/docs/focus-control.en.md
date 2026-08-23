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

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas_label",
        descriptionKey: "module.nextcloud-whiteboard.canvas_description",
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

For synchronized Focus Control, declare a `module-route` loader whose `moduleId` is that UUID and whose `routeId` is the eligible route ID. A collaboration provider must still authorize the request, create or resolve the whiteboard through server-side ctx capabilities, grant meeting participants access, and publish only stable resource identifiers through `focus:transport`.

## Built-in component pages

Authenticated dashboard pages shipped with Cognis use the Cognis Core UUID `b4d49c4a-61d0-5db2-84fd-f89b80fd6398`; Study uses its gateway UUID `338b9237-a2c8-5bcf-9437-bccc9abd9a27`. Their stable route IDs are `core.dashboard`, `core.settings`, `core.users`, `core.invite`, `core.modules`, `core.administration`, `core.docs`, `core.changelogs`, `core.license`, `core.error`, `gateway.study`, and `gateway.study.child`. They use the same `component-pages:request` contract as external modules and support overlay or fullscreen embedding. Login and demonstration entry points are not dashboard-shell component pages and are not eligible.
