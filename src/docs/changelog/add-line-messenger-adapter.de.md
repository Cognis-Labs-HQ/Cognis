# PR-Changelog — LINE Messenger Adapter hinzufügen

## Zusammenfassung

Ein neuer Authentifizierungsadapter `line` für das Auth-Gateway wurde
hinzugefügt.

Implementiert wurden LINE Login mit Authorization Code inklusive
PKCE-kompatibler Verarbeitung für mobile Nutzer (einschließlich LINE-App-Handoff),
Profilabruf sowie Unterstützung für die ID-Token-Verifikation.

Im Auth-Login wurde die Synchronisierung externer Identitäten ergänzt:
Kontoerstellung beim ersten externen Login, Live-Synchronisierung von
Anzeigename/Profilbild-URL und Durchsetzung der Lebenszykluszustände
(`active`, `unlinked`, `deactivated`, `deleted`).

Zusätzlich wurde eine Nutzerroute zum Entkoppeln von Provider-Identitäten
ergänzt: `POST /api/v1/auth/providers/:provider/unlink`. Sie markiert die
Identität als entkoppelt, deaktiviert das Konto und widerruft Tokens.

Zusätzlich wurde im Registration-Gateway ein neuer Adapter `requests` für
manuelle Freigaben ergänzt. Wenn die öffentliche Registrierung deaktiviert oder
nicht verfügbar ist, erzeugt der erste externe SSO-Login (einschließlich LINE)
nun eine ausstehende Registrierungsanfrage statt sofort ein Konto anzulegen.

Admins können diese Anfragen unter Administration → Registration prüfen und
genehmigen oder ablehnen. Die Login-Oberfläche zeigt für ausstehende, abgelehnte
oder nicht verfügbare Registrierungsanfragen lokalisierte Toast-Meldungen an.

## Geänderte Dateien/Komponenten

- Authentifizierungs-Gateway:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
- Neuer LINE-Auth-Adapter:
    - `src/adapters/auth/line/index.ts`
    - `src/adapters/auth/line/tests/line-adapter.test.ts`
    - `src/adapters/auth/line/package.json`
    - `src/adapters/auth/line/manifest.json`
    - `src/adapters/auth/line/tsconfig.json`
    - `src/adapters/auth/line/docs/index.en.md`
    - `src/adapters/auth/line/docs/index.de.md`
    - `src/adapters/auth/line/docs/index.id.md`
    - `src/adapters/auth/line/docs/index.ja.md`
- Neuer Adapter für Registrierungsanfragen:
    - `src/adapters/registration/requests/index.ts`
    - `src/adapters/registration/requests/package.json`
    - `src/adapters/registration/requests/manifest.json`
    - `src/adapters/registration/requests/tests/requests-adapter.test.ts`
- Registration-Gateway:
    - `src/gateways/registration/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/registration/manifest.json`
    - `src/gateways/registration/ui/admin-section.js`
    - `src/gateways/registration/ui/languages/en/strings.xml`
    - `src/gateways/registration/ui/languages/de/strings.xml`
    - `src/gateways/registration/ui/languages/id/strings.xml`
    - `src/gateways/registration/ui/languages/ja/strings.xml`
- Login-UI + i18n:
    - `src/ui/app/login/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Versionsindex-Updates:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commits

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
- [28ffdd6](https://github.com/le-firehawk/Cognis/commit/28ffdd6)
- [0a51d61](https://github.com/le-firehawk/Cognis/commit/0a51d61)
- [9144ee3](https://github.com/le-firehawk/Cognis/commit/9144ee3)
