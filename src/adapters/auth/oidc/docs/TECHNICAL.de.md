# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von OpenID Connect.

## Schnittstellen

authenticate(credentials) liest `accessToken` und ruft `OidcClient.introspect` auf. `sub` identifiziert das externe Konto; das Ergebnis enthält `provider`, `externalUserId`, optional `email` und `role`. Ohne Client oder Zugangsdaten folgt null.

## Konfiguration

### Konfiguration

Konfiguration über `PUT /api/v1/gateways/auth/adapters/oidc/config` (nur Admin).

| Schlüssel      | Beschreibung                                            | Erforderlich |
| -------------- | ------------------------------------------------------- | ------------ |
| `providerName` | Anzeigename des Anbieters                               | Ja           |
| `clientId`     | OAuth2-Client-ID                                        | Ja           |
| `clientSecret` | OAuth2-Client-Secret                                    | Ja           |
| `discoveryUrl` | OpenID Connect Discovery-Dokument-URL                   | Ja           |
| `adminRoles`   | Kommagetrennte Token-Rollen, die Admin-Zugriff gewähren | Nein         |

Konfigurationsbeschriftungen werden über `stringsBaseUrl` aus den Sprachressourcen dieses Adapters geladen.

`configure()` übernimmt `providerName` / `adminRoles`. Weitere Verbindungsfelder sind Schemametadaten; die Implementierung erstellt daraus keinen Protokollclient.

## Verhalten

Der mitgelieferte OIDC-Adapter besitzt keinen eingerichteten Protokollclient. createAdapter() liefert einen leeren Client; die Integration muss über setClient() einen geprüften Client bereitstellen. Konfiguration allein ermöglicht keine Anmeldung.

## Sicherheit

Nur geprüfte Claims begründen Identität. Das Anbieter-Subjekt kennzeichnet das externe Konto; adminRoles steuert erhöhte Rechte. Protokolliere weder Zugriffstoken noch clientSecret.

## Referenz

- [src/adapters/auth/oidc/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/manifest.json)
- [src/adapters/auth/oidc/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/package.json)
- [src/adapters/auth/oidc/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/oidc/index.ts)
