# OIDC SSO Authentication Adapter

## Overview

The OIDC adapter authenticates users via OpenID Connect token introspection, enabling single sign-on with any OAuth2/OIDC-compatible provider such as Google, Microsoft Entra ID, Okta, or a self-hosted Keycloak instance. Users log in by presenting an access token from the external provider; the adapter introspects it using the provider's discovery document and maps the token's roles claim to the Cognis admin flag.

OIDC is the right choice when your organisation already has a central identity provider and you want users to authenticate with their existing corporate or platform accounts. No passwords are stored in Cognis for OIDC users; the external provider owns the credential lifecycle.

## Responsibilities

- Accept an `accessToken` credential, introspect it via the configured `OidcClient` using the provider's discovery endpoint.
- Map token roles from the `roles` claim to the Cognis `isAdmin` flag using `adminRoles` configuration.
- Expose the `AuthProviderAdapter` interface to the auth gateway.
- Provide `getConfigSchema()` describing all configurable fields.

Not responsible for: managing the OAuth2 authorization code flow (the client application handles that), storing user accounts locally, or session management.

## Architecture

`OidcAuthAdapter` in `src/adapters/auth/oidc/index.ts` implements `AuthProviderAdapter`. It holds a reference to an `OidcClient` instance and a `Set<string>` of admin roles:

```ts
export interface OidcClient {
  introspect(accessToken: string): Promise<OidcTokenClaims | null>;
}

export interface OidcTokenClaims {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
}
```

On `authenticate(credentials)`, the adapter:
1. Extracts `credentials.accessToken`.
2. Calls `this.client.introspect(accessToken)` against the provider's discovery document.
3. Checks whether any of the token's `roles` intersect `adminRoles`.
4. Returns an `AuthContext` with `provider: providerName`, `externalUserId: sub`, `email`, and `isAdmin`.

On first login with an unknown `sub`, the auth gateway creates a new account via `createExternalAccount`. Subsequent logins update the account with the latest token claims via `updateExternalAccount`.

## Configuration

Configure via `PUT /api/v1/gateways/auth/adapters/oidc/config` (admin only).

| Key | Description | Required |
| --- | ----------- | -------- |
| `providerName` | Identifier shown in login responses and stored as the auth provider name | Yes |
| `clientId` | OAuth2 client ID registered with the identity provider | Yes |
| `clientSecret` | OAuth2 client secret | Yes |
| `discoveryUrl` | OpenID Connect discovery document URL (e.g. `https://accounts.google.com/.well-known/openid-configuration`) | Yes |
| `adminRoles` | Comma-separated token roles that grant admin access in Cognis | No |
