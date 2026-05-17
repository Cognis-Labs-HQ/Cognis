# SAML-SSO-Adapter

## Überblick

Der SAML-Adapter authentifiziert Benutzer über SAML 2.0 Assertions von einem externen Identitätsanbieter und ermöglicht Single Sign-On mit Enterprise-Identitätssystemen wie Microsoft AD FS, Google Workspace, Okta oder einem anderen SAML 2.0-konformen IdP.

## Verantwortlichkeiten

- Eine SAML-Response/Assertion akzeptieren, mit dem konfigurierten `SamlClient` validieren und Identitäts-Claims extrahieren.
- Ein konfigurierbares SAML-Attribut dem Cognis `isAdmin`-Flag zuordnen.
- Die `AuthProviderAdapter`-Schnittstelle für das Auth-Gateway bereitstellen.

## Architektur

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

## Konfiguration

Konfiguration über `PUT /api/v1/gateways/auth/adapters/saml/config` (nur Admin).

| Schlüssel        | Beschreibung                              | Erforderlich |
| ---------------- | ----------------------------------------- | ------------ |
| `entryPoint`     | SAML-IdP-SSO-URL                          | Ja           |
| `issuer`         | Service-Provider-Entity-ID                | Ja           |
| `certificate`    | IdP X.509-Signaturzertifikat (PEM-Format) | Ja           |
| `adminAttribute` | SAML-Attributname für Admin-Prüfung       | Nein         |
| `adminValue`     | Attributwert, der Admin-Zugriff gewährt   | Nein         |
