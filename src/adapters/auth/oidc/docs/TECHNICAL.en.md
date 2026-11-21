# Technical Reference

The public interfaces and operational rules of OpenID Connect.

## Interfaces

authenticate(credentials) reads `accessToken` and calls the injected `OidcClient.introspect`. Valid `sub` identifies the external account; the result carries `provider`, `externalUserId`, optional `email` and `role`. Without a client or credential it returns null.

## Configuration

### Configuration

Configure via `PUT /api/v1/gateways/auth/adapters/oidc/config` (admin only).

| Key            | Description                                                                                                 | Required |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `providerName` | Identifier shown in login responses and stored as the auth provider name                                    | Yes      |
| `clientId`     | OAuth2 client ID registered with the identity provider                                                      | Yes      |
| `clientSecret` | OAuth2 client secret                                                                                        | Yes      |
| `discoveryUrl` | OpenID Connect discovery document URL (e.g. `https://accounts.google.com/.well-known/openid-configuration`) | Yes      |
| `adminRoles`   | Comma-separated token roles that grant admin access in Cognis                                               | No       |

Configuration labels are resolved from this adapter’s language resources through `stringsBaseUrl`.

`configure()` applies `providerName` / `adminRoles`. The other connection fields are schema metadata; this implementation does not construct a protocol client from them.

## Behavior

The bundled OIDC adapter has no installed protocol client. createAdapter() returns an adapter with a null client; integration must explicitly supply a validated client through setClient(). Configuration alone does not enable sign-in.

## Security

Only introspected claims establish identity. The provider's subject identifies the external account; configured adminRoles determine role elevation. Never log access tokens or clientSecret.

## Reference

- [src/adapters/auth/oidc/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/manifest.json)
- [src/adapters/auth/oidc/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/package.json)
- [src/adapters/auth/oidc/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/index.ts)
