# SAML Authentication Adapter

Authenticates users via SAML 2.0 assertions.

## Configuration

| Key              | Description                                   | Required |
| ---------------- | --------------------------------------------- | -------- |
| `entryPoint`     | Identity provider SSO entry point URL         | Yes      |
| `issuer`         | Service provider issuer string                | Yes      |
| `certificate`    | Identity provider certificate (PEM)           | Yes      |
| `adminAttribute` | SAML attribute name carrying group membership | No       |
| `adminValue`     | Attribute value that grants admin role        | No       |

Configure via `PUT /api/v1/gateways/auth/adapters/saml/config` (admin only).
