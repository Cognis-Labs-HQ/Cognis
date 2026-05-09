# Social Gateway

## Overview

The Social Gateway coordinates user-facing social features: profiles, posts,
the social graph, and private messaging. It owns no database logic directly;
instead it discovers and bootstraps adapters under `src/adapters/social/`,
each responsible for a distinct domain. Disabling the gateway disables every
social adapter at once without affecting auth, notify, or any other gateway.

Adding a new social feature area is as simple as placing a new adapter
directory under `src/adapters/social/` — no central registration needed.

## Responsibilities

- Discover and bootstrap all social adapters at server startup via
  `CoreSocialGateway.bootstrapAdapters()`.
- Maintain the registry of registered adapters and expose it via
  `GET /api/v1/gateways/social/adapters` for the administration UI.
- Expose `SocialAdapterBootstrapCtx` to each adapter so it can register
  routes, static assets, navbar plugins, and capability contributions.
- Enforce the profile-first boot order so `social:profileStore` is
  available before the messages adapter runs.

Not responsible for: profile logic, messaging logic, post logic, or file
storage — those belong to the individual adapters.

## Architecture

### CoreSocialGateway

`src/gateways/social/gateway.ts` defines `CoreSocialGateway`. Adapters
self-register by calling `ctx.gateway.registerAdapter(adapter)` at the end
of a successful `bootstrapSocialAdapter`:

```ts
ctx.gateway.registerAdapter({ adapterId: "profile", adapterName: "Profile" });
```

The gateway exposes three methods:

| Method                         | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `registerAdapter(adapter)`     | Records an adapter as active                 |
| `listAdapters()`               | Returns all registered adapters for the API  |
| `setAdapterActive(id, active)` | Toggles the admin UI state (non-persistent)  |
| `bootstrapAdapters(root, ctx)` | Discovers, imports, and invokes each adapter |

### Adapter bootstrap lifecycle

`bootstrapAdapters` scans the given root directory, reads each subdirectory's
`package.json`, and dynamically imports the entry point. It calls
`bootstrapSocialAdapter(ctx)` on any module that exports it. Adapter errors
are caught per-adapter: a failing adapter is logged and skipped; the gateway
always registers regardless of adapter outcome.

Profile is sorted first so it can contribute `social:profileStore` before
the messages adapter runs. If profile is absent or fails, messages will not
find that capability and will skip profile-dependent features gracefully.

### SocialAdapterBootstrapCtx

Defined in `src/gateways/social/gateway.ts` and passed to every adapter:

| Field                                   | Description                                                 |
| --------------------------------------- | ----------------------------------------------------------- |
| `gateway`                               | `CoreSocialGateway` instance — call `registerAdapter` on it |
| `adapterId`                             | Directory name of the adapter being bootstrapped            |
| `adapterRoot`                           | Absolute path to the adapter directory                      |
| `capabilities`                          | Shared `CapabilityStore`                                    |
| `gatewayRegistry`                       | Gateway registry (read-only use recommended)                |
| `registerRoute(handler, gwId)`          | Register an HTTP route under the given gateway ID           |
| `registerStaticDir(prefix, dir)`        | Serve a static directory under `/static/<prefix>/`          |
| `registerAdapterStaticDir(gw, ad, dir)` | Serve under `/static/adapters/<gw>/<ad>/`                   |
| `registerNavbarPlugin(url)`             | Contribute a navbar script to the UI shell                  |
| `log`                                   | Optional structured logger                                  |
| `dbExecutor`                            | Database executor from `db:executor` capability             |
| `dbType`                                | Database dialect string                                     |
| `isGatewayEnabled()`                    | Returns `false` if the social gateway is disabled           |

## Bundled Adapters

- **Profile** (`src/adapters/social/profile/`) — user profiles, social graph,
  posts, per-user preferences, and file routes.
- **Messages** (`src/adapters/social/messages/`) — private messaging and
  chatrooms with server-side encrypted message bodies.

## API Routes

| Method | Path                                           | Description              | Auth  |
| ------ | ---------------------------------------------- | ------------------------ | ----- |
| `GET`  | `/api/v1/gateways/social/adapters`             | List registered adapters | Admin |
| `POST` | `/api/v1/gateways/social/adapters/:id/enable`  | Mark adapter active      | Admin |
| `POST` | `/api/v1/gateways/social/adapters/:id/disable` | Mark adapter inactive    | Admin |
