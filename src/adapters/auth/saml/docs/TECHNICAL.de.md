# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von SAML-Anmeldung.

## Schnittstellen

authenticate(credentials) liest `assertion` und ruft `SamlClient.consumeAssertion` auf. `nameId` identifiziert das externe Konto; das Ergebnis enthält `provider`, `externalUserId`, optional `email` und `role`. Ohne Client oder Zugangsdaten folgt null.

## Konfiguration

### Konfiguration

Konfiguration über `PUT /api/v1/gateways/auth/adapters/saml/config` (nur Admin).

| Schlüssel        | Beschreibung                              | Erforderlich |
| ---------------- | ----------------------------------------- | ------------ |
| `entryPoint`     | SAML-IdP-SSO-URL                          | Ja           |
| `issuer`         | Service-Provider-Entity-ID                | Ja           |
| `certificate`    | IdP X.509-Signaturzertifikat (PEM-Format) | Ja           |
| `adminAttribute` | SAML-Attributname für Admin-Prüfung       | Nein         |
| `adminValue`     | Attributwert, der Admin-Zugriff gewährt   | Nein         |

Konfigurationsbeschriftungen werden über `stringsBaseUrl` aus den Sprachressourcen dieses Adapters geladen.

`configure()` übernimmt `adminAttribute` / `adminValue`. Weitere Verbindungsfelder sind Schemametadaten; die Implementierung erstellt daraus keinen Protokollclient.

## Verhalten

Der mitgelieferte SAML-Adapter besitzt keinen eingerichteten Protokollclient. createAdapter() liefert einen leeren Client; die Integration muss über setClient() einen geprüften Client bereitstellen. Konfiguration allein ermöglicht keine Anmeldung.

## Sicherheit

Authentifizierung benötigt Assertionsprüfung und vertrauenswürdiges Signaturzertifikat. Ordne Administratorgruppen bewusst zu; ungeprüfte Assertions dürfen keine Sitzung begründen.

## Referenz

- [src/adapters/auth/saml/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/manifest.json)
- [src/adapters/auth/saml/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/package.json)
- [src/adapters/auth/saml/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/index.ts)
