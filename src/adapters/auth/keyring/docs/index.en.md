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

The adapter has no configurable fields and is required. It uses the active `db:executor` provider selected for Cognis.

## API Routes

| Method | Path                   | Description                         | Auth |
| ------ | ---------------------- | ----------------------------------- | ---- |
| GET    | `/api/v1/auth/keyring` | Read the account's encrypted vault. | User |
| PUT    | `/api/v1/auth/keyring` | Replace the encrypted vault.        | User |
| DELETE | `/api/v1/auth/keyring` | Delete the encrypted vault.         | User |
