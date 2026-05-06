# Authentication Gateway

The Authentication Gateway manages all authentication providers and user login flows.

## Routes

- `GET /api/v1/auth/login-methods` — Returns the list of enabled authentication providers.
- `POST /api/v1/auth/register` — Registers a new local account.
- `POST /api/v1/auth/login` — Authenticates a user via the specified provider. Defaults to local if no provider is given.
- `GET /api/v1/gateways/auth/adapters` — Lists all registered auth adapters (admin only).
- `GET /api/v1/gateways/auth/adapters/:id/config` — Returns the config schema for an adapter (admin only).
- `PUT /api/v1/gateways/auth/adapters/:id/config` — Updates config for an adapter (admin only).
- `POST /api/v1/gateways/auth/adapters/:id/enable` — Enables an adapter (admin only).
- `POST /api/v1/gateways/auth/adapters/:id/disable` — Disables an adapter (admin only).

## Capabilities

- `auth:accountStore` — The `LocalAccountStore` instance for the local adapter.
- `auth:createLocalAdmin` — Creates an admin account if it does not already exist.
- `auth:getLoginMethods` — Returns enabled provider metadata.

## Adapters

The gateway discovers adapters by scanning `src/adapters/auth/` at bootstrap. Each adapter directory must contain a `package.json` with a `main` field pointing to a module that exports `createAdapter()`.
