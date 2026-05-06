# API

## Overview

`src/api/` is the HTTP layer of Cognis. It hosts the Express-compatible Node.js server, the route registry, authentication middleware, and all the thin route handler modules that map incoming HTTP requests to gateway operations. The API layer is intentionally kept thin: route handlers parse and validate input, delegate to gateways, and return a stable response envelope. No route handler holds a direct reference to a database driver or external service SDK.

The server is assembled from what is present at startup rather than from a hardcoded component list. Gateways register their own routes during bootstrap via `ctx.routeRegistry.register(...)`. The server iterates the registry to build its route table. Removing a gateway removes its routes automatically.

Authentication uses opaque bearer tokens issued at login. The same token is also set as an HttpOnly cookie (`cognis_access_token`) for server-rendered page guards. A non-expiring CLI bootstrap token is written to disk at startup for trusted local tooling.

## Responsibilities

- Host the HTTP server and wire the route registry into request handling.
- Provide `requireAuth` and `getAuthClaims` middleware used by all protected route handlers.
- Enforce the `{ data }` / `{ error }` response envelope convention.
- Bootstrap all gateways in dependency order via `src/api/gateway-bootstrap.ts`.
- Initialize the database schema at startup via `src/api/bootstrap/db-init.ts`.
- Provide reuse utilities for route handlers: `src/api/reuse/`.

Not responsible for: implementing any domain logic, storing data directly, or knowing which gateways are installed.

## Architecture

### Response envelope

All API responses use one of two shapes:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Requires admin scope" } }
```

Internal error details are never sent to the client. Server-side logging captures the full error context.

### Auth model

Obtain a token via `POST /api/v1/auth/login`. The response includes `data.token`. Send the token as `Authorization: Bearer <token>` on subsequent requests. The login endpoint also sets `cognis_access_token` as an HttpOnly cookie for server-rendered route guards.

Token expiry is controlled by `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, twelve hours). At startup the server writes a non-expiring CLI bootstrap token to `COGNIS_CLI_TOKEN_PATH` (default `/app/config/cli-access.token`, mode `0600`) for trusted local CLI usage.

### Persistence defaults

| `DB_TYPE` | Backend | Connection |
| --------- | ------- | ---------- |
| `sqlite` (default) | SQLite | File at `SQLITE_PATH` (default `./data/cognis.sqlite`) |
| `postgresql` | PostgreSQL | `DATABASE_URL` required |
| `mariadb` | MariaDB | `DATABASE_URL` required |

### Key source locations

| Path | Purpose |
| ---- | ------- |
| `src/api/main.ts` | Server entry point |
| `src/api/server.ts` | HTTP server setup and route dispatch |
| `src/api/route-registry.ts` | Route registry used by gateways to self-register |
| `src/api/gateway-bootstrap.ts` | Loads and bootstraps all gateways |
| `src/api/auth/guard.ts` | `requireAuth`, `getAuthClaims` middleware |
| `src/api/auth/access-tokens.ts` | Token issuance and validation |
| `src/api/bootstrap/db-init.ts` | Schema initialization at startup |
| `src/api/reuse/` | Shared utilities (crypto, JSON reading, store helpers) |

## Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DB_TYPE` | `sqlite` | Database backend: `sqlite`, `postgresql`, or `mariadb` |
| `DATABASE_URL` | — | Connection string for PostgreSQL or MariaDB |
| `SQLITE_PATH` | `./data/cognis.sqlite` | SQLite file path (only when `DB_TYPE=sqlite`) |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200` | Bearer token lifetime in seconds |
| `COGNIS_CLI_TOKEN_PATH` | `/app/config/cli-access.token` | Path for the CLI bootstrap token |
| `COGNIS_GATEWAYS_ROOT` | `src/gateways` | Root directory for gateway discovery |
| `COGNIS_ADAPTERS_ROOT` | `src/adapters` | Root directory for adapter discovery |
| `COGNIS_MODULES_ROOT` | `src/modules` | Root directory for module discovery |
| `PORT` | `3000` | HTTP port |
| `LISTEN_HOST` | `0.0.0.0` | Bind address |

## API Routes

### System

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/system/health` | Full health status with uptime | None |
| `GET` | `/api/v1/system/healthcheck` | Minimal liveness probe | None |
| `GET` | `/api/v1/system/ui-config` | UI configuration object | None |

### Auth

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/auth/login-methods` | List enabled auth providers | None |
| `POST` | `/api/v1/auth/register` | Self-register; issues `user` role | None |
| `POST` | `/api/v1/auth/login` | Authenticate; returns bearer token | None |

### Modules

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/modules` | List all modules | Bearer |
| `POST` | `/api/v1/modules/:id/enable` | Enable a module | Admin |
| `POST` | `/api/v1/modules/:id/disable` | Disable a module | Admin |

### Gateways

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/gateways` | List all registered gateways | Admin |
| `GET` | `/api/v1/gateways/:id` | Single gateway manifest | Admin |
| `POST` | `/api/v1/gateways/:id/enable` | Mark gateway active | Admin |
| `POST` | `/api/v1/gateways/:id/disable` | Mark gateway disabled | Admin |
| `GET` | `/api/v1/admin/sections` | Admin UI sections from gateways | Admin |

### UI extensions

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/ui/page-extensions/:pageId` | Page elements contributed by gateways | Bearer |

### Docs

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/docs` | List all available doc slugs | None |
| `GET` | `/api/v1/docs/:slugOrTreePath` | Retrieve a single doc by slug | None |

### Profile

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/profile/ping` | Capability check | Bearer |
| `GET` | `/api/v1/profile` | Own profile | Bearer |
| `PATCH` | `/api/v1/profile` | Update own profile fields | Bearer |
| `PUT` | `/api/v1/profile/avatar` | Upload avatar | Bearer |
| `DELETE` | `/api/v1/profile/avatar` | Remove own avatar | Bearer |
| `PUT` | `/api/v1/profile/banner` | Upload banner | Bearer |
| `DELETE` | `/api/v1/profile/banner` | Remove own banner | Bearer |
| `GET` | `/api/v1/users/:handle/profile` | Public profile (gated by visibility) | Bearer |

### Social graph

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/api/v1/users/:handle/follow` | Follow a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/follow` | Unfollow | Bearer |
| `POST` | `/api/v1/users/:handle/block` | Block a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/block` | Unblock | Bearer |
| `GET` | `/api/v1/users/:handle/followers` | Follower list (gated by visibility) | Bearer |
| `GET` | `/api/v1/users/:handle/following` | Following list (gated by visibility) | Bearer |

### Posts

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/api/v1/posts` | Create post | Bearer |
| `GET` | `/api/v1/posts` | List own posts | Bearer |
| `DELETE` | `/api/v1/posts/:id` | Delete post (owner, moderator, or admin) | Bearer |
| `GET` | `/api/v1/users/:handle/posts` | List a user's posts | Bearer |

### Files

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `PUT` | `/api/v1/files/:bucket/:key` | Upload a file | Bearer |
| `GET` | `/api/v1/files/:bucket/:key` | Download a file | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key` | Delete a file | Admin |
| `GET` | `/api/v1/admin/file-limits` | List per-category size limits | Admin |
| `PUT` | `/api/v1/admin/file-limits/:category` | Set a size limit | Admin |

### Users (admin)

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/users` | List accounts | Admin |
| `POST` | `/api/v1/users/:username/role` | Set account role | Admin |
| `POST` | `/api/v1/users/:username/disable` | Disable an account | Admin |
| `POST` | `/api/v1/users/:username/enable` | Enable an account | Admin |
| `DELETE` | `/api/v1/users/:username` | Delete an account | Admin |
