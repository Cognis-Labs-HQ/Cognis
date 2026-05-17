# Local Auth Adapter

## Overview

The local auth adapter is the built-in credential store for Cognis. It manages usernames and hashed passwords in the platform's own database, requiring no external identity provider. The local adapter is always enabled and cannot be disabled — it guarantees that at least one authentication method is always available, including a break-glass admin account when external providers are misconfigured or unreachable.

For most single-organisation deployments, the local adapter is the only auth method needed. For enterprise deployments with an existing directory service, the local adapter provides a safety net alongside LDAP, SAML, or OIDC.

## Responsibilities

- Store and verify locally managed credentials using `crypto.scrypt`.
- Provide `register()` for account creation (used by the auth gateway's register route).
- Provide `updateLastLogin()` for tracking last login time.
- Expose `DbLocalAccountStore` as the `LocalAccountStore` implementation.

Not responsible for: managing sessions or tokens (that is the auth gateway), enforcing role assignments (done at the gateway level), or managing external identities.

## Architecture

`DbLocalAccountStore` in `src/adapters/auth/local/store.ts` is the sole persistence layer for local user accounts. It is instantiated by the auth gateway bootstrap and passed to the local adapter; nothing outside the auth gateway bootstrap holds a direct reference to it.

### Password hashing

Passwords are hashed using Node.js `crypto.scrypt` with a 16-byte random salt. Stored passwords have the format:

```
scrypt:<hex-salt>:<hex-derived-key>
```

Verification uses `crypto.timingSafeEqual` to prevent timing attacks.

```ts
async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}
```

### CLI management

Local accounts are managed via the `cognisctl` CLI using the `user:*` command namespace:

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `user:create`       | Create a new local account   |
| `user:role`         | Assign a role to an account  |
| `user:set-password` | Change an account's password |
| `user:disable`      | Disable an account           |
| `user:enable`       | Re-enable a disabled account |
| `user:delete`       | Delete an account            |

The local adapter is also the target of `POST /api/v1/auth/register` for self-registration (always issues the `user` role) and `POST /api/v1/auth/login` when no provider is specified.

## Configuration

No configurable fields. The local adapter reads its storage from whichever database executor is active (`db:executor` capability). Credential management is done exclusively through the `user:*` CLI commands or the register/login API routes.
