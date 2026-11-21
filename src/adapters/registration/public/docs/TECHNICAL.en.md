# Technical Reference

The public interfaces and operational rules of Public Registration.

## Interfaces

Contributes a `register` provider to the Registration gateway. It accepts `username`, `password`, and optional `email` and `displayName`; it exposes no independent HTTP route.

## Configuration

Enable Public Registration through Registration administration only when accounts may be created without invitation tokens.

## Behavior

The provider trims the username and display name, requires a username and password, creates a local account with the `user` role, and invokes the injected profile creator when available.

The adapter accepts username, password, optional email and optional displayName. It trims username and displayName, rejects an empty username or password with username_and_password_required, and calls the account store with the user role. Its result contains username, enabled and role. The account store owns persistence and propagates failures. If createProfile is provided, profile creation is awaited after account creation. The adapter is disabled by default; the gateway checks its public-registration policy and rejects disabled registration. The optional email is part of the input contract but is not passed to the account registration operation.

## Security

Callers cannot request an administrative role through this provider. Registration policy and any external-identity continuation are enforced by the owning gateway.

## Reference

- [src/adapters/registration/public/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/manifest.json)
- [src/adapters/registration/public/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/package.json)
- [src/adapters/registration/public/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/index.ts)
