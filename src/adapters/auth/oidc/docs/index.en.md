# OIDC SSO Authentication Adapter

Authenticates users via OpenID Connect token introspection.

## Configuration

| Key            | Description                                         | Required |
| -------------- | --------------------------------------------------- | -------- |
| `providerName` | Identifier shown in login responses                 | Yes      |
| `clientId`     | OAuth2 client ID                                    | Yes      |
| `clientSecret` | OAuth2 client secret                                | Yes      |
| `discoveryUrl` | OpenID Connect discovery document URL               | Yes      |
| `adminRoles`   | Comma-separated token roles that grant admin access | No       |

Configure via `PUT /api/v1/gateways/auth/adapters/oidc/config` (admin only).
