# Usage

Practical procedures for Sign In.

## Prerequisites

Use an enabled login provider; registration may require an invitation.

## Examples

Sign in, complete any verification challenge, then open Settings to inspect account security and sign out when finished.

Resolve `auth:authorizeAccountTarget` version 1 through `system:contracts`. Pass `{ actor: { sub, role }, accountId, allowSelf }` using claims from the injected Auth guard. Users management sets `allowSelf: false`; self-service consumers set it to `true`.

A permitted decision is `{ allowed: true, accountId, isCurrent }`. Check the exact returned target and call `isCurrent()` immediately before using it. A rejected decision is `{ allowed: false, status, code }`. Missing or incompatible contracts are unavailable, never permission to use a weaker check.

The optional `allowFounder` constraint defaults to `true` when omitted. Supplying `false` rejects a founder with `403 protected_founder_account`, independent of the actor or target role. Any supplied nonboolean is `400 bad_request`. Ordinary Users actions and TFA retain their existing founder behavior; only guarded deprovision requests this additional restriction. Alternative providers must implement this constraint as part of this version-1 contract, not silently ignore it.

With `allowSelf: true` and `allowFounder: false`, self-service also reads authoritative metadata and can fail for a founder, missing account or unavailable metadata. Omitting the founder constraint preserves metadata-free self-service.

## Expected Results

Cognis establishes an account-bound session; provider and account access rules still apply.

## Troubleshooting

Check provider availability, verification requirements and account status. A cancelled keyring unlock must not be mistaken for a failed login.
