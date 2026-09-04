# SAML SSO Auth Adapter

## Overview

The SAML adapter authenticates users via SAML 2.0 assertions from an external identity provider, enabling single sign-on with enterprise identity systems such as Microsoft Active Directory Federation Services (AD FS), Google Workspace (as an IdP), Okta, or any other SAML 2.0-compliant IdP. Users authenticate at the identity provider and are redirected back to Cognis with a signed XML assertion; the adapter validates the signature and maps the assertion's attributes to a Cognis account.

SAML is the right choice for environments where OIDC is not available or where the existing identity infrastructure is built on SAML federations.

## Responsibilities

- Accept a SAML response/assertion credential, validate it with the configured `SamlClient`, and extract identity claims.
- Map a configurable SAML attribute to the Cognis admin flag using `adminAttribute` and `adminValue`.
- Expose the `AuthProviderAdapter` interface to the auth gateway.
- Provide `getConfigSchema()` describing all configurable fields.

Not responsible for: managing the SAML SP metadata, handling redirects (the client application manages the browser flow), or storing user accounts locally.

## Architecture

`SamlAuthAdapter` in `src/adapters/auth/saml/index.ts` implements `AuthProviderAdapter`. It holds a reference to a `SamlClient` instance:

```ts
export interface SamlClient {
    validateAssertion(samlResponse: string): Promise<SamlAssertion | null>;
}

export interface SamlAssertion {
    nameId: string;
    email?: string;
    attributes?: Record<string, string | string[]>;
}
```

On `authenticate(credentials)`, the adapter:

1. Extracts `credentials.samlResponse` (base64-encoded XML assertion).
2. Calls `this.client.validateAssertion(samlResponse)`.
3. Reads the attribute named by `adminAttribute` from the assertion.
4. If the attribute value matches `adminValue`, sets `isAdmin: true`.
5. Returns an `AuthContext` with `provider: 'saml'`, `externalUserId: nameId`, `email`, and `isAdmin`.

On first login, the auth gateway creates a new account via `createExternalAccount`. Subsequent logins update the account via `updateExternalAccount`.

## Configuration

Configure via `PUT /api/v1/gateways/auth/adapters/saml/config` (admin only).

| Key              | Description                                                            | Required |
| ---------------- | ---------------------------------------------------------------------- | -------- |
| `entryPoint`     | SAML IdP SSO URL (e.g. `https://idp.example.com/sso/saml`)             | Yes      |
| `issuer`         | Service Provider entity ID (must match the SP registration in the IdP) | Yes      |
| `certificate`    | IdP X.509 signing certificate (PEM format, without header/footer)      | Yes      |
| `adminAttribute` | SAML attribute name whose value is checked for admin access            | No       |
| `adminValue`     | Attribute value that grants admin access (e.g. `admin`, `true`)        | No       |
