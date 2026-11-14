# Account Target Policy

Auth owns the privileged-account boundary used by account management and two-factor administration.

## Usage Examples

Resolve `auth:authorizeAccountTarget` version 1 through `system:contracts`. Pass `{ actor: { sub, role }, accountId, allowSelf }` using claims from the injected Auth guard. Users management sets `allowSelf: false`; self-service consumers set it to `true`.

A permitted decision is `{ allowed: true, accountId, isCurrent }`. Check the exact returned target and call `isCurrent()` immediately before using it. A rejected decision is `{ allowed: false, status, code }`. Missing or incompatible contracts are unavailable, never permission to use a weaker check.

The optional `allowFounder` constraint defaults to `true` when omitted. Supplying `false` rejects a founder with `403 protected_founder_account`, independent of the actor or target role. Any supplied nonboolean is `400 bad_request`. Ordinary Users actions and TFA retain their existing founder behavior; only guarded deprovision requests this additional restriction. Alternative providers must implement this constraint as part of this version-1 contract, not silently ignore it.

With `allowSelf: true` and `allowFounder: false`, self-service also reads authoritative metadata and can fail for a founder, missing account or unavailable metadata. Omitting the founder constraint preserves metadata-free self-service.

## Technical Specification

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

Known companion boundary: [Jitsi at revision 2dfe50b](https://github.com/Cognis-Labs-HQ/cognis-module-jitsi-meet/blob/2dfe50bfd46f32e08291a2aacbdeb27d559fb2f8/api/index.js#L380-L451) still uses public persistence/input fields for meeting and related resource cleanup. That revision must be migrated to `auth:deprovisionOutcome` or disabled before deployment is treated as protected; the bundled change does not secure an old external hook. Read-only production API/bootstrap audits found no matching cleanup consumer in Whiteboard `ef9e9b4` or Terms `330bf49`. These are source-audit results, not executed compatibility tests.

Auth requires Core’s shallow-immutable flow envelopes, implemented in Core 0.6.6. Deploy that Core release before or together with Auth and the receipt consumers. The runtime checks the actual frozen envelope, not a version label: an unfrozen legacy runner is unavailable before target metadata or deprovision effects, and observing it invalidates older decisions and receipts. Tested maximum dependency ranges alone do not supply this minimum guarantee. Only envelope references are immutable; nested input, data and result contents remain mutable, so owner-authenticated receipts are still required. Extensions must not replace top-level context references; use mutable data fields for shared work.

### Integration

Deploy Auth 2.2.12 with TFA 1.3.13 and API 0.13.36. Older or alternative Auth implementations must provide the versioned executable contract before cross-account management is available. There is no fallback to direct account-store lookup or minimum caller role. Self-only TFA setup, method details and pending-login operations do not acquire a cross-account target through query parameters.
