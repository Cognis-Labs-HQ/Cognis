# Technical Reference

The browser host owns routing, shared presentation, localization and public-asset recovery.

## Interfaces

`uiCtx.capabilities` resolves active browser providers; `bindCapability(id)` defers bounded startup calls until registration. `ui:log` sends diagnostics to [Logging](/docs/gateways/logging/technical). Owners mount page content with an AbortSignal and release registrations on disposal. [Page Composer](/docs/page-composer/technical), [Tutorials](/docs/tutorials/technical) and [component windows](/docs/focus-control/technical) specify their own public UI contracts.

## Configuration

Language, theme and font come from account Settings. Shared labels use flat `ui.reuse.*` keys; component catalogs use their owner namespace. The resolver tries the selected language and then English; an absent English key is an error. Visual surfaces use theme tokens. [Profile](/docs/adapters/social/profile/technical) owns account preference persistence.

## Behavior

The SPA router loads declared pages and cancels superseded mounts; direct URLs use the same page entrypoints. Core shell assets are separate from gateway/adapter-owned pages.

The service worker caches public assets, not private API responses or authenticated documents. Mutable public resources may return cached bytes while an on-demand network refresh runs, bounded to once per minute. Content-hashed resources reuse immutable bytes. Worker updates wait for existing controlled tabs to close. Connection recovery offers a guarded refresh.

Private offline snapshots and queued writes belong to their authenticated account/session and owner. Public cached code does not grant offline resource access. Shared banners, loading feedback and popups follow the host lifetime; provider failures are logged through the gateway.

## Security

Owners validate permissions before data reads and mutations; hidden navigation is only presentation. Do not put account payloads, credentials or private HTML into public cache APIs. Rich text must pass the appropriate renderer.

## Reference

- [src/ui/reuse/ui-ctx.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/ui-ctx.js)
- [src/ui/reuse/app-router.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/app-router.js)
- [src/ui/reuse/i18n.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/i18n.js)
- [src/ui/public/sw.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/public/sw.js)
