# User Keyring Adapter

## Overview

The User Keyring adapter persists opaque browser-encrypted vaults for authenticated accounts. It is a required Authentication adapter because passwords, encryption keys, and other user-specific secrets need one stable capability regardless of the active login provider.

The browser-facing keyring remains the reusable `src/adapters/auth/keyring/ui/keyring.js` surface. Encryption and decryption happen in the browser; the adapter never receives plaintext secrets.

## Responsibilities

- Bootstrap the keyring vault store through the `db:executor` capability.
- Contribute the keyring route factory and vault-store capabilities through `ctx`.
- Persist and return validated opaque vault envelopes.

Not responsible for: authenticating users, deriving encryption keys, or interpreting stored secrets.

## Architecture

`src/adapters/auth/keyring/index.ts` is discovered by the Authentication gateway and contributes `auth:keyringVaultStore` plus `auth:keyringRouteFactory`. The gateway supplies its route context to the factory, keeping authentication checks injected and the route self-contained. `src/adapters/auth/keyring/store.ts` accesses persistence only through the database executor capability.

## Configuration

The required adapter uses the active `db:executor`. Administrators configure the maximum encrypted vault size in MiB and the password-derivation iteration count through the adapter settings. Existing vaults retain their recorded derivation count; the configured count applies when a vault is created.

## API Routes

| Method | Path                   | Description                         | Auth |
| ------ | ---------------------- | ----------------------------------- | ---- |
| GET    | `/api/v1/auth/keyring` | Read the account's encrypted vault. | User |
| PUT    | `/api/v1/auth/keyring` | Replace the encrypted vault.        | User |
| DELETE | `/api/v1/auth/keyring` | Delete the encrypted vault.         | User |

## Browser capability API

Components obtain keyring operations from `uiCtx.capabilities`; they do not import adapter internals. Use `keyring:forComponent` to create an attributed scope, then resolve secrets with a stable capability-owned identifier. Resolution validates an existing value and can prompt or consult an authoritative source when it is missing or invalid. The adapter also exposes lock state, entry management, password changes, activity pagination, and temporary guest-keyring lifecycle operations through the registered capabilities.

```js
const keyring = uiCtx.capabilities.require("keyring:forComponent")("Meetings");
const password = await keyring.resolve("meeting:123:password", {
    action: "join",
    process: "meeting 123",
    validate: (value) => value.length > 0,
    prompt: ({ invalid }) => askForPassword(invalid),
});
```

## Login unlock behavior

During login, the adapter opportunistically attempts to decrypt an existing vault with the account password. A failed attempt leaves the vault locked and never opens an unlock dialog or blocks dashboard navigation. The contextual unlock dialog is requested only when a component resolves keyring-backed content.

## Browser-session unlock restoration

After a successful unlock, the adapter stores the non-extractable Web Crypto key in its IndexedDB session-key store and writes only a non-secret marker to `sessionStorage`. A page reload can restore the unlocked vault within the same tab session without retaining the password or an extractable key. A finite relock preference records one absolute deadline when the keyring is unlocked; reads, writes, page reloads, and server restarts neither extend nor shorten it. “On Logout” stores no deadline and remains unlocked until the authenticated session explicitly ends. Explicit lock, logout, account-instance mismatch, and an elapsed finite deadline invalidate restoration. Components still request access through their attributed keyring scope, which first attempts restoration and opens the contextual unlock dialog only when restoration is unavailable.

## Cancelled access and manual recovery

Cancelling an attributed unlock request resolves every concurrent waiter as refused and suppresses subsequent automatic requests for the rest of the page lifetime. The adapter emits `cognis:keyring-access-state` with `{ suppressed: true }`; encrypted-content pollers must stop or no-op while this state is active. A floating lock control is added above the page-composer toggle stack. Activating it performs the only permitted manual unlock attempt, clears suppression after successful authentication, and emits `{ suppressed: false }`. Reloading the page also resets suppression.

## Destructive reset

`DELETE /api/v1/auth/keyring` is the destructive reset contract. Before deleting the opaque vault, Authentication invokes every owner registered through `auth:registerKeyringDataOwner`, removing the account only from encrypted rooms and other objects whose access depends on keyring entries. The account instance, profile, follower relationships, and unrelated account-owned data remain unchanged. The locked Settings action uses this route and immediately starts first-time keyring setup. The unlocked action remains a non-destructive removal of entries from the current vault.
