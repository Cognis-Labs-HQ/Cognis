# Focus Control

## Manifest schema

Pages declare `pageManifest.focusControl`; individual composer elements may declare the same property. A surface has stable `id` and `pageId`, localized `labelKey` and `descriptionKey`, a declared `route` or `module-route` loader, `overlay` and/or `fullscreen` modes, a synchronization flag, and JSON state. Loader callbacks and HTML are never accepted from messages.

## Flows and providers

The `declare`, `authorize`, `start`, `load`, `publish`, `apply`, `transfer`, and `end` flows separate policy, transport, and rendering. Collaboration providers contribute `focus:session-provider` on the server and `focus:transport` in the browser through ctx. Hooks are removed when their component is disabled.

## Security and synchronization

Providers authenticate every request, scope it to a collaboration resource, validate membership and role on every mutation, limit state to 64 KiB, and use monotonically increasing revisions. Current authoritative state is returned for reconnecting and late-joining clients; stale and duplicate revisions are ignored.

## External module example

An external whiteboard declares a `module-route` loader with its discovered module ID and route ID. Its Focus state contains only the stable whiteboard resource reference and presentation metadata; document updates continue through its own gateway.
