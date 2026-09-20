# Authentication Gateway

## Overview

The Authentication Gateway is the single point of entry for all login and identity operations in Cognis. It decouples the rest of the platform from any specific credential provider by sitting between route handlers and the concrete auth adapters. Switching authentication providers — from local passwords to LDAP or SAML — requires only enabling the new adapter through the admin API; no route handler or core service changes.

The gateway discovers adapters by scanning `src/adapters/auth/` at bootstrap time. Each adapter directory must export a `createAdapter()` function. The local adapter is always loaded first and treated specially because it backs the `user:*` CLI commands and the initial admin account creation flow. All other adapters are loaded from their directories and can be enabled or disabled at runtime by an admin without a server restart.

## Responsibilities

- Discover and register all auth adapters from `src/adapters/auth/` at bootstrap.
- Manage adapter enable/disable state persisted in `auth_adapter_configs`.
- Verify credentials by delegating to the enabled adapter for the requested provider.
- Issue access tokens after successful authentication via `issueAccessToken`.
- Contribute the documented capability set: `auth:accountStore`, `auth:createLocalAdmin`, `auth:getLoginMethods`, `auth:registerProvider`, `auth:registerLoginButton`, `auth:registerPageScriptOrigins`, `auth:issueAccessToken`, `auth:getAuthClaims`, `auth:requireAuth`, `auth:requireRoleAccess`, `auth:revokeAccessTokensForSubject`, `auth:revokeSetupPendingAccessTokens`, and `auth:routeContext`.
- Register all auth API routes and adapter admin routes.

Not responsible for: storing user profile data (the profile gateway), session management beyond token issuance, or any non-auth business logic.

### Runtime provider lifecycle

Runtime providers must use the Authentication gateway as their configuration and power-state authority, exactly like LDAP. The provider supplies a stable `id`, `getConfigSchema()`, `configure(config)`, and `isConfigured()`; Administration reads and writes `/api/v1/gateways/auth/adapters/<id>/config` and toggles `/enable` or `/disable`. The module must not maintain a second activation flag or treat module enablement as adapter enablement.

During bootstrap, await `auth:registerProvider(provider, requires)` before registering routes or login presentation. The promise resolves only after Cognis restores the adapter's persisted configuration and enabled state. Register the branded button afterward, retain both disposers, and remove the button before unregistering the provider during teardown. A provider with no persisted enabled state starts disabled and must complete setup through the gateway-owned adapter configuration flow.

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

| Capability                       | Type                                           | Description                                                                  |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `auth:accountStore`              | `LocalAccountStore`                            | Local account store used by the local adapter                                |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | Creates an admin account if it does not exist                                |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | Returns metadata for all enabled providers                                   |
| `auth:registerProvider`          | `async (provider, requires?) => dispose`       | Registers a module authentication provider and returns its cleanup function  |
| `auth:registerLoginButton`       | `(descriptor) => dispose`                      | Registers branded login-button presentation and returns its cleanup function |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | Replaces trusted http(s) script origins for one owner in page CSP headers    |

Authentication providers must await `auth:registerProvider` before calling `auth:registerLoginButton`. Registration restores the adapter's persisted configuration and enabled state before resolving, matching filesystem-discovered providers such as LDAP. The descriptor requires the registered `providerId`, a complete localized `label`, and a same-origin `iconUrl`. Optional `backgroundColor`, `borderColor`, and `textColor` values use six-digit hexadecimal colors. The login page always renders the icon and full label at both compact and wide viewport sizes. Providers must call the returned cleanup function when their contribution is disabled. Unstyled non-credential methods are omitted rather than rendered as generic login buttons.

Browser-facing OAuth redirects may use `/sso/<routeNamespace>/<path>`. Cognis forwards query-based callbacks directly to the provider and bridges fragment-based responses into the same server-owned callback without leaving the page spinner active. Callback failures return to Login with a localized error.

A provider may declare `routeNamespace` and `registerRoutes(router)` on its adapter. The router accepts `GET` and `POST` paths relative to `/api/v1/auth/<routeNamespace>` so OAuth callbacks can live under the Authentication gateway without granting the contributing module direct access to protected core routes. Namespaces are restricted to safe URL segments, core Authentication namespaces are reserved, duplicate routes are rejected, and provider disposal removes every contributed route.

External-provider sessions pass through `gateAccountCreation` before `ensureExternalAccount`. When open registration is disabled, Cognis stores an unknown authenticated identity behind an opaque, expiring attempt ID and returns `account_creation_required` with a `registrationUrl`. Providers redirect to that URL rather than rendering authorization UI. The Registration Token adapter contributes the authorization form to the standard registration shell and resumes the held identity without exposing provider callback state. Public registration bypasses token authorization.

## API Routes

| Method | Path                                         | Description                                       | Auth  |
| ------ | -------------------------------------------- | ------------------------------------------------- | ----- |
| `GET`  | `/api/v1/auth/login-methods`                 | List enabled authentication providers             | None  |
| `POST` | `/api/v1/auth/register`                      | Self-register a new local account                 | None  |
| `POST` | `/api/v1/auth/login`                         | Authenticate; returns bearer token                | None  |
| `POST` | `/api/v1/auth/sso/start`                     | Start an external provider authorization redirect | None  |
| `POST` | `/api/v1/auth/verify`                        | Verify current user's password                    | User  |
| `GET`  | `/api/v1/gateways/auth/adapters`             | List all registered auth adapters                 | Admin |
| `GET`  | `/api/v1/gateways/auth/adapters/:id/config`  | Get config schema for an adapter                  | Admin |
| `PUT`  | `/api/v1/gateways/auth/adapters/:id/config`  | Update config for an adapter                      | Admin |
| `POST` | `/api/v1/gateways/auth/adapters/:id/test`    | Test an adapter configuration                     | Admin |
| `POST` | `/api/v1/gateways/auth/adapters/:id/enable`  | Enable an adapter                                 | Admin |
| `POST` | `/api/v1/gateways/auth/adapters/:id/disable` | Disable an adapter                                | Admin |

Adapter test failures may include an `error.fieldErrors` object mapping any number of configuration field IDs to safe diagnostic messages.

Adapter listings and configuration contracts include `stringsBaseUrl` when an adapter owns localized Administration resources.

## Browser keyring bootstrap

The Authentication gateway loads its required keyring adapter before registering browser session-flow hooks. Every direct page load and refresh can therefore restore the current tab's non-extractable session key automatically; when restoration is unavailable, the first protected-content resolver opens the contextual keyring unlock prompt.

## Share failure propagation

Browser session results preserve a neutral alternate-authentication failure reason so a public resource page can distinguish a missing resource from other unavailable states without importing Authentication internals.

Authentication source changes run the `reconcile-auth-sources` flow after persistence. Adapter hooks use its `reconcile-accounts` stage to invalidate sessions and reconcile source-owned identities without route-level provider branching.

## Browser session boundaries

Password-confirmation invalidation runs only for an authenticated full-account session. Anonymous and Share guest page setup can lock or replace keyring state without sending an account-only `DELETE /api/v1/auth/verify` request.

## External profile providers

SSO modules may register `auth:registerExternalProfileProvider` through CTX. The resolver receives the provider ID, Cognis account ID, external user ID, and authenticated provider session, and may return a searchable handle, display name, bio, location, website, avatar bytes, and banner bytes. Cognis also uses a provider session `handle` or `username` as the initial profile handle when supplied, rather than exposing an opaque external account ID as the username. The Profile adapter applies returned data through its own persistence and file-storage capability when the external account is first created.

### External profile synchronization

An external authentication integration can expose the `auth:syncExternalProfile` CTX query. It accepts `{ providerId }` for the authenticated account, refreshes the provider-owned profile through `auth:resolveExternalProfile`, and returns only after Cognis has persisted the resulting handle, display fields, avatar bytes, and banner bytes through the Profile and Files capabilities. Provider image URLs are inputs to the integration only; the query must return media bytes so browser surfaces always render Cognis-owned files. The browser integration contributes the same-named UI capability, which the own-profile banner menu detects without knowing a provider or module name.

### Deleted external identities

Deleting an externally authenticated account records a one-way fingerprint of its provider identity before removing account-owned data. A later successful provider authentication clears that deletion record transactionally while recreating the account, matching directory-backed authentication behavior. Failed authentication cannot clear the record, and the fingerprint is not exposed to browser clients.

### Provider-scoped account names

New external accounts use the provider namespace in both the local account key and profile handle. A provider session for handle `firehawksystems` with `accountNamespace` set to `x` therefore becomes `x:firehawksystems`; a local `firehawksystems` account and identities such as `line:firehawksystems` remain distinct. Existing `(provider, external_user_id)` mappings remain authoritative on later logins even if a provider handle changes.
