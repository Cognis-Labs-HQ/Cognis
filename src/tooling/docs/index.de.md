# Tooling

## Überblick

Das Verzeichnis `src/tooling/` enthält alle Entwickler-Tools für die Cognis-Codebase: Linting-Skripte, den TypeScript-Konfigurations-Generator, ein Container-Healthcheck-Skript und die `cognisctl`-Betriebs-CLI.

## Verantwortlichkeiten

- Lesbarkeitsregeln durchsetzen (keine Tabs, kein nachgestelltes Leerzeichen) via `lint-readable.mjs`.
- Placeholder-Standards durchsetzen via `lint-placeholder.mjs`.
- Ein konsolidiertes `tsconfig.json` für das Monorepo generieren.
- Betriebsverwaltungsbefehle über `cognisctl` bereitstellen.

## Architektur

### Linting

Alles Linting läuft über `npm run lint`, das beide Lint-Skripte in Folge ausführt.

### `cognisctl`-CLI

`cognisctl` ist die primäre Betriebssteuerfläche. Befehlsmodule werden automatisch erkannt aus:
- `src/tooling/cli/commands/` — eingebaute Core-Befehle
- Jedes `cli/index.js`, das von einem installierten Modul exportiert wird

| Namespace | Beispiel-Befehle |
| --------- | ---------------- |
| `user:*` | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete` |
| `user:preferences:*` | `user:preferences:clear` |
| `system:*` | `system:health`, `system:info` |
| `modules:*` | `modules:list`, `modules:enable`, `modules:disable`, `modules:install` |
| `gateway:*` | `gateway:list` |
| `api:*` | `api:token` |

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `COGNIS_CLI_TOKEN_PATH` | — | Pfad zur Datei mit dem API-Token für authentifizierte `cognisctl`-Befehle |
| `COGNIS_MODULES_ROOT` | `src/modules` | Zum Entdecken von modul-beigetragenen Unterbefehlen |
