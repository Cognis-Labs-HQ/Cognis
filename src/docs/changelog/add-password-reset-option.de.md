# Auth Passwort Reset

## Summary

Ein providerabhängiger Passwort-Reset-Flow wurde in Benutzer-Einstellungen → Sicherheit ergänzt, inklusive Serverrouten, die die Unterstützung des aktiven Anbieters prüfen und adaptereigene Reset-Logik ausführen.

Die Registrierung der Administration-Sektion „Authentication“ wurde entfernt, damit Authentifizierungsanbieter über ihre Adapter-Konfigurationsflächen verwaltet werden.

Die Auth-Adapter wurden erweitert: mit Passwort-Reset-Fähigkeitsverträgen und optionalen LDAP-Writeback-Einstellungen im Adapter-Konfigurationsschema.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (Settings-Sektion, Passwort-Reset-Routen, Provider-Bindung für Tokens)
- `src/gateways/auth/gateway.ts` (Reset-Unterstützung und Gateway-Orchestrierung)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (providergebundene Token-Claims)
- `src/gateways/auth/ui/security-prefs.js` und `src/gateways/auth/ui/languages/*/strings.xml` (neue Sicherheitsoberfläche in Einstellungen)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (Adapter-Reifung und Fähigkeiten)
- `src/gateways/auth/tests/*` und `src/adapters/auth/*/tests/*` (Testabdeckung)
- Versionsmanifeste und `src/docs/versions.*.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/5943c6b5689c6a4ddc9fde487bc128f45bd1be25
