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
- Versionsindex-Updates:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commits

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
