# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Befehlszeilenwerkzeuge.

## Schnittstellen

Dieser Arbeitsbereich stellt gemeinsamen Plattformcode bereit. Öffentliche Funktionsverträge gehören zur jeweiligen Fähigkeit, zum Befehl oder Funktionsdienst; dieses Paket stellt keinen eigenen HTTP-Dienst bereit.

## Konfiguration

### Konfiguration

| Variable                       | Standard           | Beschreibung                                                              |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Pfad zur Datei mit dem API-Token für authentifizierte `cognisctl`-Befehle |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Zum Entdecken von Modul-Unterbefehlen                                     |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Optionale Pfadliste für Gateway-Unterbefehle                              |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Optionale Pfadliste für Adapter-Unterbefehle                              |

## Verhalten

### Überblick

Das Verzeichnis `src/tooling/` enthält alle Entwickler-Tools für die Cognis-Codebase: Linting-Skripte, den TypeScript-Konfigurations-Generator, ein Container-Healthcheck-Skript und die `cognisctl`-Betriebs-CLI.

### Verantwortlichkeiten

- Lesbarkeitsregeln durchsetzen (keine Tabs, kein nachgestelltes Leerzeichen) via `lint-readable.mjs`.
- Placeholder-Standards durchsetzen via `lint-placeholder.mjs`.
- Ein konsolidiertes `tsconfig.json` für das Monorepo generieren.
- Betriebsverwaltungsbefehle über `cognisctl` bereitstellen.

### Linting

Alles Linting läuft über `npm run lint`, das beide Lint-Skripte in Folge ausführt.

### `cognisctl`-CLI

`cognisctl` ist die primäre Betriebssteuerfläche. Befehlsmodule werden automatisch erkannt aus:

- `src/tooling/cli/commands/` — eingebaute Core-Befehle
- Jedes `cli/index.js`, das von einem installierten Modul exportiert wird

| Namespace            | Beispiel-Befehle                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `user:*`             | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete`                                 |
| `user:preferences:*` | `user:preferences:clear`                                                                                                      |
| `system:*`           | `system:health`, `system:info`                                                                                                |
| `component:*`        | `component:list`, `component:enable`, `component:disable`, `component:config:get`, `component:config:set`, `component:import` |
| `api:*`              | `api:token` (erstellt ein temporäres 1‑Stunden-Admin-Notfalltoken für curl)                                                   |

Eingebaute `cognisctl`-Befehle können antwortungsabhängige Terminalausgabe mit Überschriften, ausgerichteten Feldern und ANSI-Farben rendern, wenn das Terminal sie unterstützt; Befehle ohne benutzerdefinierten Renderer fallen auf formatiertes JSON zurück.

## Sicherheit

Öffentliche Fähigkeiten und Befehle behalten ihre vorgangsbezogene Autorisierung. Die Paketinstallation gewährt keinen Zugriff auf private Ressourcen.

## Referenz

Quellcode und Paketmetadaten: `src/tooling/cli/`.
