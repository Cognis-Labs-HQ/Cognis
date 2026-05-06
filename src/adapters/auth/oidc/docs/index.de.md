# OIDC-SSO-Authentifizierungsadapter

## Überblick

Der OIDC-Adapter authentifiziert Benutzer über OpenID Connect Token-Introspektion und ermöglicht Single Sign-On mit jedem OAuth2/OIDC-kompatiblen Anbieter wie Google, Microsoft Entra ID, Okta oder einer selbst gehosteten Keycloak-Instanz.

## Verantwortlichkeiten

- Ein `accessToken`-Credential akzeptieren und es über den konfigurierten `OidcClient` introspektieren.
- Token-Rollen aus dem `roles`-Claim dem Cognis `isAdmin`-Flag zuordnen.
- Die `AuthProviderAdapter`-Schnittstelle für das Auth-Gateway bereitstellen.

## Architektur

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

## Konfiguration

Konfiguration über `PUT /api/v1/gateways/auth/adapters/oidc/config` (nur Admin).

| Schlüssel | Beschreibung | Erforderlich |
| --------- | ------------ | ------------ |
| `providerName` | Anzeigename des Anbieters | Ja |
| `clientId` | OAuth2-Client-ID | Ja |
| `clientSecret` | OAuth2-Client-Secret | Ja |
| `discoveryUrl` | OpenID Connect Discovery-Dokument-URL | Ja |
| `adminRoles` | Kommagetrennte Token-Rollen, die Admin-Zugriff gewähren | Nein |
