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
follow the same discovery/bootstrap lifecycle used by the Notification
gateway: `createSocialAdapter()` declares adapter identity for admin listings
and persisted slider state, while `bootstrapSocialAdapter(ctx)` wires routes,
static assets, navbar entries, and capabilities.

The gateway exposes these methods:

| Method                         | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `discoverAdapters(root)`       | Imports adapter factories and records identities  |
| `loadPersistedConfigs()`       | Restores persisted enable/disable state           |
| `registerAdapter(adapter)`     | Records a discovered adapter                      |
| `listAdapters()`               | Returns all registered adapters for the API       |
| `enableAdapter(id)`            | Enables an adapter and persists the state         |
| `disableAdapter(id)`           | Disables an adapter and persists the state        |
| `bootstrapAdapters(root, ctx)` | Imports and invokes adapter runtime bootstrappers |

### Adapter bootstrap lifecycle

`discoverAdapters` scans the given root directory, reads each subdirectory's
`package.json`, imports the adapter entry point, and registers any module that
exports `createSocialAdapter()`. After persisted config is loaded,
`bootstrapAdapters` imports the same modules and calls `bootstrapSocialAdapter`
when present. Adapter errors are caught per-adapter and logged.

Profile is sorted first so it can contribute `social:profileStore` before
the messages adapter runs. If profile is absent or fails, messages will not
find that capability and will skip profile-dependent features gracefully.

### SocialAdapterBootstrapCtx

Defined in `src/gateways/social/gateway.ts` and passed to every adapter:

| Field                                   | Description                                                |
| --------------------------------------- | ---------------------------------------------------------- |
| `gateway`                               | `CoreSocialGateway` instance for gateway-owned controls    |
| `adapterId`                             | Directory name of the adapter being bootstrapped           |
| `adapterRoot`                           | Absolute path to the adapter directory                     |
| `capabilities`                          | Shared `CapabilityStore`                                   |
| `gatewayRegistry`                       | Gateway registry (read-only use recommended)               |
| `registerRoute(handler, gwId)`          | Register an HTTP route under the given gateway ID          |
| `registerStaticDir(prefix, dir)`        | Serve a static directory under `/static/<prefix>/`         |
| `registerAdapterStaticDir(gw, ad, dir)` | Serve under `/static/adapters/<gw>/<ad>/`                  |
| `registerNavbarPlugin(url, isEnabled?)` | Contribute a conditionally enabled navbar script           |
| `log`                                   | Optional structured logger                                 |
| `dbExecutor`                            | Database executor from `db:executor` capability            |
| `dbType`                                | Database dialect string                                    |
| `isGatewayEnabled()`                    | Returns `false` if the social gateway is disabled          |
| `isAdapterEnabled(id?)`                 | Returns `false` when the current/named adapter is disabled |

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

## Membership mutation standard

Social components expose membership changes with the same two verbs: `POST` adds a user and `DELETE` removes a user. Use the documented canonical path for each relationship, make both operations idempotent, identify users by handle at the HTTP boundary, and use canonical account IDs inside `ctx` capabilities. Successful mutations return `200`; malformed input, missing resources, and denied operations return `400`, `404`, and `403` respectively.

| Relationship     | Add                                                                              | Remove                                                         | `ctx` capability                                                                                              |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Chatroom member  | `POST /api/v1/social/messages/rooms/:roomId/members` with `{ "handle": "user" }` | `DELETE /api/v1/social/messages/rooms/:roomId/members/:handle` | `social:messages:membership` with `add({ roomId, actorAccountId, userAccountId })` and matching `remove(...)` |
| Profile follower | `POST /api/v1/social/users/:handle/follow`                                       | `DELETE /api/v1/social/users/:handle/follow`                   | `social:profile:followers` with `add({ followerAccountId, followedAccountId })` and matching `remove(...)`    |

`add` is an idempotent ensure-active operation: it also clears an archived membership. Meeting integrations must call it for every participant join before loading chat, so a user who intentionally left the chat can rejoin it with the meeting. Leaving chat does not remove the participant from the meeting.

HTTP routes authenticate and authorize the acting user. Capabilities are the trusted server-to-server surface: callers must already have authority to act, and must always supply the actor explicitly. Consumers obtain capabilities from `ctx.capabilities`; they never import an adapter store or implementation.

## Profile identity capability

The Profile adapter publishes `social:profile:identity` to both platform and module consumers. Its `normalizeHandleKey` and `normalizeHandleKeys` functions apply the canonical handle normalization rules, while `resolveAccountHandle(accountId, fieldName?)` resolves a canonical account ID to its normalized profile handle and rejects missing accounts or handles. Orchestrators use this capability instead of importing the Profile adapter or duplicating normalization logic.
