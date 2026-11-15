# Technical Reference

The public interfaces and operational rules of Sign In.

## Interfaces

### Architecture

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

External-provider sessions pass through `gateAccountCreation` before `ensureExternalAccount`. An enabled public registration adapter authorizes SSO account provisioning independently of the public native signup policy. Otherwise Cognis stores an unknown authenticated identity behind an opaque, expiring attempt ID and returns `account_creation_required` with a `registrationUrl`. Providers redirect to that URL. The Registration Token adapter contributes authorization to the standard registration shell and resumes the held identity without exposing provider callback state.

### API Routes

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

## Configuration

Provider schemas configure external connections. COGNIS_ACCESS_TOKEN_TTL_SECONDS controls token lifetime; account validation policy and TFA methods remain registered owner-specific choices.

## Behavior

### Overview

The Authentication Gateway is the single point of entry for all login and identity operations in Cognis. It decouples the rest of the platform from any specific credential provider by sitting between route handlers and the concrete auth adapters. Switching authentication providers — from local passwords to LDAP or SAML — requires only enabling the new adapter through the admin API; no route handler or core service changes.

The gateway discovers adapters by scanning `src/adapters/auth/` at bootstrap time. Each adapter directory must export a `createAdapter()` function. The local adapter is always loaded first and treated specially because it backs the `user:*` CLI commands and the initial admin account creation flow. All other adapters are loaded from their directories and can be enabled or disabled at runtime by an admin without a server restart.

### Responsibilities

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

### Browser keyring bootstrap

The Authentication gateway loads its required keyring adapter before registering browser session-flow hooks. Every direct page load and refresh can therefore restore the current tab's non-extractable session key automatically; when restoration is unavailable, the first protected-content resolver opens the contextual keyring unlock prompt.

### Share failure propagation

Browser session results preserve a neutral alternate-authentication failure reason so a public resource page can distinguish a missing resource from other unavailable states without importing Authentication internals.

Authentication source changes run the `reconcile-auth-sources` flow after persistence. Adapter hooks use its `reconcile-accounts` stage to invalidate sessions and reconcile source-owned identities without route-level provider branching.

### Browser session boundaries

Password-confirmation invalidation runs only for an authenticated full-account session. Anonymous and Share guest page setup can lock or replace keyring state without sending an account-only `DELETE /api/v1/auth/verify` request.

### External profile providers

SSO modules may register `auth:registerExternalProfileProvider` through CTX. The resolver receives the provider ID, Cognis account ID, external user ID, and authenticated provider session, and may return a searchable handle, display name, bio, location, website, avatar bytes, and banner bytes. Cognis also uses a provider session `handle` or `username` as the initial profile handle when supplied, rather than exposing an opaque external account ID as the username. The Profile adapter applies returned data through its own persistence and file-storage capability when the external account is first created. A valid `profileVisibility` value (`hidden`, `private`, `friends`, or `community`) is persisted as the new profile’s visibility.

### External profile synchronization

An external authentication integration can expose the `auth:syncExternalProfile` CTX query. It accepts `{ providerId }` for the authenticated account, refreshes the provider-owned profile through `auth:resolveExternalProfile`, and returns only after Cognis has persisted the resulting handle, display fields, avatar bytes, and banner bytes through the Profile and Files capabilities. Provider image URLs are inputs to the integration only; the query must return media bytes so browser surfaces always render Cognis-owned files. In the browser, an integration calls `auth:registerExternalProfileSynchronizer` with its provider ID and synchronization function. The Authentication-owned registry exposes the action only for the current provider, so another installed integration cannot handle or overwrite the wrong account profile.

### Deleted external identities

Deleting an externally authenticated account records a one-way fingerprint of its provider identity before removing account-owned data. A later successful provider authentication clears that deletion record transactionally while recreating the account, matching directory-backed authentication behavior. Failed authentication cannot clear the record, and the fingerprint is not exposed to browser clients.

### Provider-scoped account names

New external accounts use the provider namespace in both the local account key and profile handle. A provider session for handle `firehawksystems` with `accountNamespace` set to `x` therefore becomes `x:firehawksystems`; a local `firehawksystems` account and identities such as `line:firehawksystems` remain distinct. Existing `(provider, external_user_id)` mappings remain authoritative on later logins even if a provider handle changes.

### Browser media policy

Authenticated pages permit media from same-origin routes and browser-generated `blob:` URLs. This allows trusted UI clients to play authenticated audio responses without permitting arbitrary remote media origins.

### Module lifecycle integration

`auth:registerKeyringDataOwner(ownerId, purge)` is a public server capability. It rejects duplicate owner IDs and returns an identity-checked disposer. A module uses its stable `module:<id>` owner and registers the disposer with `ctx.registerDisposer`; purge receives the normalized account ID. Purge only keyring-dependent state, preserving account identity and unrelated shared resources.

### Session Setup

Every authenticated session checks `/api/v1/auth/setup-status`, including restored SSO sessions. Auth owns `auth:getSetupIntegrations(accountId, role)` and evaluates the selected registered validation mode. Its provider supplies same-origin scripts exporting `enforceSetup({ accountId })`. Required setup completes before navigation or offline use; provider unavailability does not waive the policy. Founder administrator recovery remains exempt.

### Login Feedback

Credential, TFA-code and SSO authorization requests show the shared loading wheel and release it before interactive setup. Duplicate credential submissions are ignored while pending. Public offline-cache cleanup and refresh run in the background after login. Last-login timestamps are recorded for SSO even when the local authentication adapter is disabled.

### Login and queued delivery

See the [shared contract](/docs/features/technical) for this behavior.

### Session and Component Boundaries

Auth publishes `session:isOfflineValid` as the synchronous, network-free authority for verified offline access. It checks completed setup, the current account/token and session expiry. Queue owners consume this contract rather than interpreting auth storage. Account setup skips alternate guest sessions; server setup-status uses Share’s classification capability before requesting TFA or email integrations. Normal local and SSO accounts retain required setup enforcement.

### Account-bound Queues

See the [shared contract](/docs/api/technical) for this behavior.

### Bounded SSO Registration Attempts

Invitation-gated SSO identities are held before account, profile or email provisioning. Cancelled or expired attempts cannot resume; expiry is enforced at the exact deadline for registration and TFA. Enabling the public registration adapter still permits SSO account creation independently of native public signup. Existing accounts are not deleted based on their provider or age.

### Registered Validation Modes

`auth:userValidationModes.register` accepts an ID, localized label, optional resource base, required registration fields, availability callback, validation callback and optional setup integration. Registration is bootstrap-only and owned by the contributor’s lifecycle. Auth evaluates the selected callback through `auth:evaluateUserValidation` (`resolvePolicy`, `validateAccount`, `verifyResult`); it has no method-ID switch. Missing or unavailable configured policies fail closed. Founder administrator recovery remains exempt. Administration displays registered metadata; an unavailable saved choice stays selected rather than silently changing the policy.

Adapter contract registration follows [the shared gateway bootstrap contract](/docs/gateways).

### Font Loading

Authentication footer links wrap into accessible rows, and provider labels remain readable on narrow screens.

### Final Session Assurance

The version-1 Auth-owned `auth:login` capability runs `auth:prepareLogin` (`authenticate`, `assessSession`, `authorizeSession`), then calls `auth:completeSession`. The primary `login` flow returns `authenticated` preparation data, never an ordinary token. Primary preparation still provisions account metadata where needed. Consumers requiring a finished login must call the capability, not a raw flow. The production login route and registered-flow tests use this boundary; TFA verification and setup call the final capability. Existing primary-flow extensions finish before assurance and commitment.

`auth:completeSession` is a version-1 trusted server capability for successful assurance handlers. Its read-only `auth:prepareSession` stages (`validateAccount`, `validateLifecycle`, `authorizeSession`) recheck account enablement and optional Profile lifecycle. Both preparation flows accept return-only or data-mutating denials and reject throws before activation. After every extension finishes, Auth terminally activates and issues a session, serialized per account, with no later policy hook. An available lifecycle provider whose read or activation fails denies login with `session_unavailable`; absent Profile remains supported. Last-login recording follows assurance. Owner-held attempts and factor validation supply assurance, never request-body completion flags. Lifetime leases invalidate stale work. Failed commits revoke only their own issued ordinary token. Cross-owner persistence is not transactional: activation may remain if a final write persists then fails or a subsequent commit step fails after all gates succeeded; Auth does not roll back unrelated profile changes. Pending, invalid and abandoned factors never activate profiles or leave ordinary tokens.

TFA contributes the version-1 `tfa:assessSession` capability and its staged flow. A known active TFA gateway without working assessment fails closed. Intentionally absent or administratively disabled TFA remains optional. Persisted enabled enrollment remains required during provider outages, with recovery codes still available; persisted administrator disablement explicitly waives that provider. Optional publisher-metadata errors do not remove an otherwise valid provider.

Factor verification and setup completion both use the Auth-owned final commit. `auth:consumePendingLoginAttempt` atomically consumes an unexpired primary-authenticated attempt after successful factor verification; concurrent or repeated completion cannot reuse it. Setup verification also excludes concurrent completion of the same setup. A failed final commit returns no ordinary token or cookie; sign in again after the underlying failure is resolved. Owner cleanup removes assessment/commit flows and pending login attempts; stale in-flight work fails closed. The existing login and setup tutorials keep the same controls and progression; unavailable sessions use translated error toasts.

### Typed Authentication Boundaries

Shared behavior: [TFA](/docs/gateways/tfa/technical).

### Restricted token lifecycle

Persisted token format 2 requires explicit security fields and rejects unsupported formats, malformed or ambiguous records. Rejected sessions require signing in again; there is no automatic format conversion. Current valid normal, restricted and revoked credentials retain their authority across restart. Token persistence failures are reported rather than acknowledged as successful writes.

The auth:revokeSetupPendingAccessTokens capability takes no arguments and revokes all pending sessions; subject exemptions are no longer supported.

### Credential Scope

Account operations require verified account sessions. Shared-resource operations explicitly verify guest credentials and recheck the current grant before applying resource permissions. Account names never determine credential type. Revoked or expired access is denied.

### Registration Onboarding

Public signup and invitation redemption return a 30-minute onboarding credential, not a login session. It cannot access ordinary account APIs, establish browser identity, refresh a session, or satisfy a factor challenge. Sign in normally afterward; the existing final login and TFA assessment still apply.

Auth owns the version-1 `auth:onboarding` contract. `registerOperation({id, available?, execute})` captures the calling contributor's current bootstrap scope; the ID must belong to that owner. Duplicate registration fails. Disposal, failed bootstrap and re-enable invalidate captured work. `listOperations()` lists registered IDs, including temporarily unavailable handlers; it is presentation metadata, not authorization. `issue(accountId)` verifies account existence and issues bounded authority. Pending account validation does not require an enabled account.

POST /api/v1/auth/onboarding/operations accepts {operation, input}. Auth verifies the bearer purpose, expiry, current account and owner lifetime, runs its preparation flow, then invokes the registered handler outside that extensible flow. Raw flow calls cannot execute operations. The handler receives {accountId, assertCurrent}; it must await assertCurrent immediately before each effect after asynchronous work. Never use a supplied account ID, ordinary ownership shortcuts or a shared-resource identity. Handlers validate their own input. Known owner failures may throw exactly {status, code}, with status 400, 409, 422, 429 or 503 and a short lowercase underscore-delimited code. Unexpected failures return onboarding_operation_failed without internal details.

POST /api/v1/auth/onboarding/complete revokes the current credential for either completion or cancellation; it never exchanges it for a session. Successful real login and unverified-account deletion revoke that account's onboarding credentials without revoking unrelated sessions or guest access. Interrupted requests remain bounded by expiry. Persisted format 2 explicitly validates onboarding purpose, user role, local provider, non-pending setup and an expiry no more than 30 minutes after issue.

Token-file writes and provider database or delivery effects are not one transaction. A completed effect can remain when a later check or persistence write fails. Errors do not promise rollback. Browser cleanup is best effort when the page closes or the network fails; no unload delivery guarantee is made.

Revocation is immediately effective in this process, but a failed token-file write can leave the previous on-disk authority until a successful retry. Completion is idempotent for a retained revoked onboarding credential and retries that persistence. Account reads, asynchronous provider availability and owner effects are not cross-store atomic. The issuance capability is a trusted server surface, not a public account-ID minting endpoint.

### Pending Login Continuation

After an SSO provider accepts the first factor, accounts with a configured second factor return to `/login` to enter the already-issued code. No session is issued or profile reactivated before verification. Retry retrieves the pending prompt after a temporary loading failure; Cancel abandons that attempt and returns to ordinary sign-in. Reloading does not send another email.

Auth 2.2.10 adds `GET /api/v1/auth/login-attempt` and `DELETE /api/v1/auth/login-attempt`. GET returns `{data: null}` or the existing TFA presentation, including `tfaRequired`, `loginAttemptId`, method descriptors and `loginUrl: "/login"`. DELETE accepts JSON `{loginAttemptId}` and cancels only an exact match with the requesting browser's cookie. Routes execute the Auth-owned `auth:loginContinuation` flow (`validateRequest`, `applyContinuation`); ordinary account authorization and factor verification remain unchanged.

The `cognis_login_attempt` cookie is HttpOnly, SameSite=Lax, scoped to `/api/v1/auth`, and follows the existing Secure-cookie policy. It refers to the original server-owned five-minute attempt. GET neither creates an attempt nor extends its expiry or redelivers a challenge. Descriptor metadata, including issued code length and resend timing, is preserved without provider-specific interpretation. Expiry, successful atomic consumption, cancellation and Auth cleanup make the continuation unusable. Explicit logout and a subsequent successful primary-only login abandon the matching attempt.

A new pending login supersedes the attempt named by its incoming cookie. Tabs share the browser cookie; cancellation includes the displayed attempt ID so an older tab cannot cancel a newer one. GET and DELETE never overwrite the cookie, including after expiry, preventing delayed responses from clearing a newer attempt. First-time concurrent requests without a shared pending cookie create independent attempts; whichever response cookie the browser retains selects its next continuation. Neither request grants the other's account a session. Cancellation cannot undo an already completed login. Attempts remain process-local and are lost on restart.

SSO integrations must treat `tfaRequired: true` as incomplete authentication and follow only the explicit `loginUrl: "/login"` marker on a successful response. The marker is emitted only after Auth binds a live, matching account/provider attempt. Deploy Auth 2.2.10 with X SSO 1.0.63; the module fails closed when an older host cannot supply this continuation contract. Local login and SSO without TFA retain their existing completion paths. Browser clients keep attempt IDs only in memory or request bodies, never URLs or browser storage. The login integration receives a query-only root scoped to its current attempt and mounted form; delayed work cannot modify a superseded view.

Login mounts and TFA integration clients use linked UI lifetimes. Replacing the page, form or attempt and successful Cancel dispose the previous client immediately. A failed or still-pending cancellation leaves the current client alive. Auth passes the client lifetime as `signal` to the TFA factory; it does not change server attempt expiry or cancel an already dispatched resend.

Auth 2.2.14 and TFA 1.3.14 require a coordinated JavaScript and asset deployment. The TFA integration module must export `loginLifecycleVersion = 1`. Its factory requires `lifecycleVersion: 1` and a real `AbortSignal`; the returned client must expose `lifecycle: { version: 1, signal }` with that same signal and `refreshPrompt()`. Missing or mismatched contracts fail before the prompt can send a request, with a login error and structured lifecycle diagnostic. Auth 2.2.13 and TFA 1.3.13 lack this contract. Update both packages and their served/bundled assets together, then reload old Login tabs. Third-party replacements for the TFA login integration must implement the contract before enabling this release; there is no cleanup-free compatibility path. Non-TFA sign-in and method-provider descriptors are unchanged.

While a resend remains unresolved, its action reads “Requesting code…” and exposes a busy state. It stays locked without inventing a new deadline or retrying. If the resend finishes during Cancel and cancellation later fails, the same prompt reconciles the settled result, pending lock and issued deadline. A relative server wait is anchored when its response arrives, so time spent waiting for cancellation does not restart it.

### Bounded challenge delivery

`auth:getPendingLoginLifetime` version 1 is a read-only public lookup of `{ id, accountId, expiresAt, signal }` for an existing primary-authenticated attempt. It cannot create or extend authority. Auth allocates the attempt before automatic factor preparation without issuing a session or activating a profile. Its immutable five-minute deadline applies to delivery. Consumption, explicit cancellation, expiry, continuation replacement, logout and owner cleanup abort challenge resources. Existing cookie-bound continuation, stale-attempt guards and resume without redelivery remain unchanged. Successful factor consumption cancels challenge resources without cancelling the separate final session commit. TFA requires this contract and fails closed when it is absent.

### Password Form Labels

Security uses the shared `ui.reuse.password_requirements` and `ui.reuse.passwords_match` XML keys. Its registered Settings section loads Auth and host catalogs, without requiring Registration to be enabled. Password policy, confirmation validation and provider restrictions remain unchanged. Deploy Auth 2.2.13 with the matching host UI catalogs.

### Password Form Labels

The Account Security guide explains opening Change Password where supported, satisfying the displayed policy, confirming the same new password, and choosing Save or Cancel. Successful Save signs out the account; Cancel preserves the decision to discard edits. The two existing guide targets and completion identity remain unchanged.

### Identity and permissions

The actor's verified Auth claims remain authoritative; this policy does not reload or upgrade the actor's role. An ordinary account can act only on itself when self-service is allowed. Administrators may manage other user, teacher and moderator accounts. Only an owner may manage another admin or owner. A founder with persisted admin or owner role has effective owner role; the founder flag alone does not elevate another role. Users retains its additional action-specific founder, role and deletion restrictions.

Target IDs are nonempty, unchanged identifiers without whitespace, control characters or path separators. Cross-account requests read `auth:accountStore.getInfo(accountId)` and require the matching `accountId`, a known role and a boolean `isFounder`. Missing accounts return `404 not_found`; malformed metadata, failed reads or unavailable owners return `503 account_policy_unavailable`. There is no fallback role or cached target authorization. Invalid requests return `400 bad_request`; access denials use `403 forbidden`, `protected_self_account` or `protected_admin_account`.

### Stages and lifetime

Auth registers `auth:authorizeAccountTarget` with `validateRequest`, `readAccount` and `authorizeTarget` stages within its bootstrap lifetime. The caller's input is copied and frozen. Private operation state binds each stage to one invocation; raw-flow execution, captured input replay and public flow-data changes cannot grant authority. Permitted cross-account targets are read again after extensible stages, so a delayed hook cannot retain a previously lower role or a deleted target.

Contract removal, failed bootstrap, disable/re-enable, or account-store replacement invalidates pending work and previously returned lifecycle checks. Consumers also recheck their own route lifetime, the current verified actor and the exact contract registration before downstream effects. Independent requests do not share metadata promises or cache decisions.

This is a point-in-time authorization check, not a transaction spanning account metadata and another component's storage. Metadata changes after the final read are not locked out, and `isCurrent()` verifies lifecycle rather than rereading account roles. Callers must use the decision immediately, not retain it for later actions.

### Prepared management and deprovision effects

Users copies and freezes the verified actor once. It keeps its initial denial before body or metadata preparation, then reacquires the policy after those awaits and immediately before the first mutation. Once an authorized role change begins, the same actor/lifecycle lease protects subsequent profile synchronization; reauthorizing against the operation's own new admin role would interrupt a legitimate promotion.

The HTTP `deprovision-user` input additionally supplies the frozen `actor` and a pure `isAuthorizationCurrent()` function. Auth captures them privately during `authorize-request`, checks the supplied function strictly, and reacquires the version-1 target policy in `persist-state` after extensible preparation. A missing, malformed, throwing or non-true supplied guard fails closed. A supplied guard cannot be removed by later input or stage-result changes. Canonical terminal policy denials return `persisted: false`, `status` and `reason`; Users sends one corresponding response rather than reporting success.

The existing LDAP reconciliation producer is a separate system-owner workflow and omits the HTTP actor/guard envelope. This omission is not a fallback for Users. Delete and disable start with their account-store mutation; archive starts by revoking sessions in `persist-state`. Cleanup reports archive's captured revocation count without repeating the effect. After a mutation starts, existing dependency cleanup can finish even when a lease expires, while the route checks actor/lifecycle again before its later profile change. This is not a cross-store transaction: a started external effect cannot be cancelled or rolled back by these checks, so partial completion remains possible. Guarded deprovision passes `allowFounder: false`; the terminal policy evaluates the current founder flag together with the target role, preserving the existing prohibition for every founder role, including owner-initiated operations. Only changes after that final read remain outside this point-in-time boundary.

### Authoritative deprovision outcomes

`auth:deprovisionOutcome` version 1 is an Auth-owned object contract with `read(input, stageResults)` and `deletedAccount(input, stageResults)`. The methods require the exact original input object and the exact invocation result-map identity supplied by the real flow runner. Copies, mismatched runs and unfinished invocations have no receipt. Reusing one input object starts a new invocation and invalidates its older receipt. Returned outcomes are frozen and private owner state remains authoritative when later hooks replace public stage-result arrays or mutate input fields.

`read` returns the owner's terminal `{ persisted: true, username, action, revokedTokenCount? }` or `{ persisted: false, status, reason }`, or `undefined` when unavailable. `deletedAccount` returns the captured account ID only for a committed delete. Both methods enforce Auth generation, contract declaration and provider identity themselves, including retained references after disable/reactivate or replacement. Receipts do not reread roles or undo an effect already started.

Users binds the reader before starting the flow, validates the returned target/action, and uses only the receipt for its response and later profile effect. Auth account-instance, Calendar, Keyring, Profile, Classes, Messages and Internal Notification cleanup resolve `deletedAccount` through `ctx`; public `persist-state` values and mutable input fields cannot authorize deletion. Missing, incompatible or malformed receipt providers fail closed. Deploy Auth with the updated consumers together; alternative providers must implement this exact-invocation contract, and old public-result-only consumers are not compatible with this protection. Existing cleanup ordering and already-started-effect partial-completion limits remain.

Known companion boundary: [Jitsi at revision 2dfe50b](https://github.com/Cognis-Labs-HQ/cognis-module-jitsi-meet/blob/HEAD/api/index.js#L380-L451) still uses public persistence/input fields for meeting and related resource cleanup. That revision must be migrated to `auth:deprovisionOutcome` or disabled before deployment is treated as protected; the bundled change does not secure an old external hook. Read-only production API/bootstrap audits found no matching cleanup consumer in Whiteboard `ef9e9b4` or Terms `330bf49`. These are source-audit results, not executed compatibility tests.

Auth requires Core’s shallow-immutable flow envelopes, implemented in Core 0.6.6. Deploy that Core release before or together with Auth and the receipt consumers. The runtime checks the actual frozen envelope, not a version label: an unfrozen legacy runner is unavailable before target metadata or deprovision effects, and observing it invalidates older decisions and receipts. Tested maximum dependency ranges alone do not supply this minimum guarantee. Only envelope references are immutable; nested input, data and result contents remain mutable, so owner-authenticated receipts are still required. Extensions must not replace top-level context references; use mutable data fields for shared work.

### Integration

Deploy Auth 2.2.12 with TFA 1.3.13 and API 0.13.36. Older or alternative Auth implementations must provide the versioned executable contract before cross-account management is available. There is no fallback to direct account-store lookup or minimum caller role. Self-only TFA setup, method details and pending-login operations do not acquire a cross-account target through query parameters.

## Security

Authentication validates primary credentials before session issuance and any required TFA challenge. Account, role and resource authorization remain separate; keyring unlock refusal must not create or switch account identity.

SSO accounts use opaque random IDs. Provider IDs are stored separately and exposed only to administrators; public usernames never include them. Auth reserves usernames before profile or email side effects: duplicate names within one provider are rejected, while different providers receive a short random suffix when needed. Users lists and action endpoints distinguish public `username` from internal `accountId`.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

## Reference

### Technical Specification

| Page / surface                             | Guide            | Access         |
| ------------------------------------------ | ---------------- | -------------- |
| `/settings` · `#auth-security-reset-panel` | Account Security | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
