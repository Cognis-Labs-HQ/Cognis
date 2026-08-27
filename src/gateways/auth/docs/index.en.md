# Authentication Gateway

## Overview

The Authentication Gateway is the single point of entry for all login and identity operations in Cognis. It decouples the rest of the platform from any specific credential provider by sitting between route handlers and the concrete auth adapters. Switching authentication providers — from local passwords to LDAP or SAML — requires only enabling the new adapter through the admin API; no route handler or core service changes.

The gateway discovers adapters by scanning `src/adapters/auth/` at bootstrap time. Each adapter directory must export a `createAdapter()` function. The local adapter is always loaded first and treated specially because it backs the `user:*` CLI commands and the initial admin account creation flow. All other adapters are loaded from their directories and can be enabled or disabled at runtime by an admin without a server restart.

## Responsibilities

- Discover and register all auth adapters from `src/adapters/auth/` at bootstrap.
- Manage adapter enable/disable state persisted in `auth_adapter_configs`.
- Verify credentials by delegating to the enabled adapter for the requested provider.
- Issue access tokens after successful authentication via `issueAccessToken`.
- Contribute the documented capability set: `auth:accountStore`, `auth:createLocalAdmin`, `auth:getLoginMethods`, `auth:registerProvider`, `auth:registerPageScriptOrigins`, `auth:issueAccessToken`, `auth:getAuthClaims`, `auth:requireAuth`, `auth:requireRoleAccess`, `auth:revokeAccessTokensForSubject`, `auth:revokeSetupPendingAccessTokens`, and `auth:routeContext`.
- Register all auth API routes and adapter admin routes.

Not responsible for: storing user profile data (the profile gateway), session management beyond token issuance, or any non-auth business logic.

## Architecture

The central class is `CoreAuthGateway` in `src/gateways/auth/gateway.ts`. It holds a map of registered adapters, a set of enabled adapter IDs, and a reference to the local adapter (which is wired separately via `setLocalAdapter()`).

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): () => boolean;
  setLocalAdapter(adapter: AuthProviderAdapter & { ... }): void;
  async discoverAdapters(authAdaptersRoot: string): Promise<void>;
  async loadPersistedConfigs(): Promise<void>;
  async getEnabledAdapter(id: string): Promise<AuthProviderAdapter | null>;
  async getAdapter(): Promise<AuthProviderAdapter | null>;
  async authenticate(credentials: Record<string, unknown>, providerId?: string): Promise<AuthContext | null>;
  async createLocalAdmin(username: string, password: string): Promise<AuthContext>;
  async getLoginMethods(): Promise<AdapterInfo[]>;
}
```

`getEnabledAdapter(id)` returns a specific adapter by ID only if it is currently enabled. `getAdapter()` (no argument) returns the first enabled adapter, used when the login request does not specify a provider. Both return `null` if no suitable adapter is found.

`registerAdapter()` returns the provider cleanup function used by module disposers. Calling it removes that exact provider registration, its enabled state, and its dependency metadata; if another provider has since replaced the same ID, cleanup leaves the replacement intact. This cleanup is necessary because disabling a module must remove every capability it contributed.

Bootstrap in `src/gateways/auth/bootstrap.ts` and `src/gateways/auth/bootstrap/`:

1. Instantiates `DbLocalAccountStore` from `src/adapters/auth/local/store.ts`.
2. Instantiates `CoreAuthGateway` with the DB executor and type.
3. Loads the local adapter via `setLocalAdapter()`.
4. Calls `discoverAdapters(authAdaptersRoot)` to load all other adapters.
5. Calls `loadPersistedConfigs()` to restore enable/disable state from the database.
6. Runs capability/bootstrap hooks from `src/gateways/auth/bootstrap/`.
7. Registers routes and capabilities.

Capabilities contributed:

| Capability                       | Type                                           | Description                                                                 |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `auth:accountStore`              | `LocalAccountStore`                            | Local account store used by the local adapter                               |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | Creates an admin account if it does not exist                               |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | Returns metadata for all enabled providers                                  |
| `auth:registerProvider`          | `(provider, requires?) => dispose`             | Registers a module authentication provider and returns its cleanup function |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | Replaces trusted http(s) script origins for one owner in page CSP headers   |

## API Routes

| Method | Path                                         | Description                           | Auth  |
| ------ | -------------------------------------------- | ------------------------------------- | ----- |
| `GET`  | `/api/v1/auth/login-methods`                 | List enabled authentication providers | None  |
| `POST` | `/api/v1/auth/register`                      | Self-register a new local account     | None  |
| `POST` | `/api/v1/auth/login`                         | Authenticate; returns bearer token    | None  |
| `POST` | `/api/v1/auth/verify`                        | Verify current user's password        | User  |
| `GET`  | `/api/v1/gateways/auth/adapters`             | List all registered auth adapters     | Admin |
| `GET`  | `/api/v1/gateways/auth/adapters/:id/config`  | Get config schema for an adapter      | Admin |
| `PUT`  | `/api/v1/gateways/auth/adapters/:id/config`  | Update config for an adapter          | Admin |
| `POST` | `/api/v1/gateways/auth/adapters/:id/enable`  | Enable an adapter                     | Admin |
| `POST` | `/api/v1/gateways/auth/adapters/:id/disable` | Disable an adapter                    | Admin |

## Browser keyring bootstrap

The Authentication gateway loads its required keyring adapter before registering browser session-flow hooks. Every direct page load and refresh can therefore restore the current tab's non-extractable session key automatically; when restoration is unavailable, the first protected-content resolver opens the contextual keyring unlock prompt.

## Share failure propagation

Browser session results preserve a neutral alternate-authentication failure reason so a public resource page can distinguish a missing resource from other unavailable states without importing Authentication internals.
