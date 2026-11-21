# Technical Reference

The public interfaces and operational rules of SAML Sign In.

## Interfaces

authenticate(credentials) reads `assertion` and calls the injected `SamlClient.consumeAssertion`. Valid `nameId` identifies the external account; the result carries `provider`, `externalUserId`, optional `email` and `role`. Without a client or credential it returns null.

## Configuration

### Configuration

Configure via `PUT /api/v1/gateways/auth/adapters/saml/config` (admin only).

| Key              | Description                                                            | Required |
| ---------------- | ---------------------------------------------------------------------- | -------- |
| `entryPoint`     | SAML IdP SSO URL (e.g. `https://idp.example.com/sso/saml`)             | Yes      |
| `issuer`         | Service Provider entity ID (must match the SP registration in the IdP) | Yes      |
| `certificate`    | IdP X.509 signing certificate (PEM format, without header/footer)      | Yes      |
| `adminAttribute` | SAML attribute name whose value is checked for admin access            | No       |
| `adminValue`     | Attribute value that grants admin access (e.g. `admin`, `true`)        | No       |

Configuration labels are resolved from this adapter’s language resources through `stringsBaseUrl`.

`configure()` applies `adminAttribute` / `adminValue`. The other connection fields are schema metadata; this implementation does not construct a protocol client from them.

## Behavior

The bundled SAML adapter has no installed protocol client. createAdapter() returns an adapter with a null client; integration must explicitly supply a validated client through setClient(). Configuration alone does not enable sign-in.

## Security

Authentication depends on the configured assertion validator and trusted signing certificate. Map administrator groups deliberately; an unvalidated assertion must not establish a session.

## Reference

- [src/adapters/auth/saml/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/manifest.json)
- [src/adapters/auth/saml/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/package.json)
- [src/adapters/auth/saml/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/index.ts)
