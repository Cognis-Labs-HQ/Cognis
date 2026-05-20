# Auth Passwort Reset

## Summary

Ein providerabhängiger Passwort-Reset-Flow wurde in Benutzer-Einstellungen → Sicherheit ergänzt, inklusive Serverrouten, die die Unterstützung des aktiven Anbieters prüfen und adaptereigene Reset-Logik ausführen.

Die Registrierung der Administration-Sektion „Authentication“ wurde entfernt, damit Authentifizierungsanbieter über ihre Adapter-Konfigurationsflächen verwaltet werden.

Die Auth-Adapter wurden erweitert: mit Passwort-Reset-Fähigkeitsverträgen und optionalen LDAP-Writeback-Einstellungen im Adapter-Konfigurationsschema.

Der Laufzeitfehler im Sicherheitsbereich der Einstellungen wurde behoben, indem die Sektion korrekt an den Settings-Root gebunden wurde; zusätzlich wurden fehlende Security-Strings behoben, indem Settings-Sektionen ihre komponenteneigenen Sprachdateien zusammenführen.

Die Meldung „Authentifizierungsanbieter“ wurde aus dem Sicherheitsbereich entfernt, und eine neue Passwortänderungs-Fähigkeitsroute steuert nun einen Warn-Toast beim Laden der Einstellungen, wenn der aktive Anbieter keine Passwortänderung unterstützt.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (Settings-Sektion, Passwort-Reset/Passwortänderungs-Fähigkeitsrouten, Provider-Bindung für Tokens)
- `src/gateways/auth/gateway.ts` (Reset-Unterstützung und Gateway-Orchestrierung)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (providergebundene Token-Claims)
- `src/gateways/auth/ui/security-prefs.js` und `src/gateways/auth/ui/languages/*/strings.xml` (Bereinigung der Sicherheitsoberfläche und Warn-Toast bei nicht unterstütztem Anbieter)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (Adapter-Reifung und Fähigkeiten)
- `src/gateways/auth/tests/*` und `src/adapters/auth/*/tests/*` (Testabdeckung)
- Versionsmanifeste und `src/docs/versions.*.md`
- `src/ui/app/settings/index.js` (i18n-Erweiterung für komponenteneigene Settings-Strings)

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/a33f0faa
- https://github.com/le-firehawk/Cognis/commit/9490a011
- https://github.com/le-firehawk/Cognis/commit/8ba1d8b2
