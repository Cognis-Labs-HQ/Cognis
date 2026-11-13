# Tooling

## Überblick

Das Verzeichnis `src/tooling/` enthält alle Entwickler-Tools für die Cognis-Codebase: Linting-Skripte, TypeScript-Quellprüfungen, ein Container-Healthcheck-Skript und die `cognisctl`-Betriebs-CLI.

## Verantwortlichkeiten

- Lesbarkeitsregeln durchsetzen (keine Tabs, kein nachgestelltes Leerzeichen) via `lint-readable.mjs`.
- Placeholder-Standards durchsetzen via `lint-placeholder.mjs`.
- Alle TypeScript-Quellen und Tests mit `npm run typecheck` prüfen.
- Betriebsverwaltungsbefehle über `cognisctl` bereitstellen.

## Architektur

### TypeScript-Quellprüfung

Vor jedem Commit `npm run typecheck` ausführen. `npm run ci:test` prüft Typen vor den Tests; beide CI-Pipelines verwenden dieselbe Prüfung. `npm run build` erzeugt Produktionsdateien separat mit esbuild für Node 24.

Die zentrale `tsconfig.json` ist das maßgebliche strikte Projekt ohne Dateiausgabe. Sie erfasst alle `.ts`-, `.tsx`-, `.mts`- und `.cts`-Dateien unter `src`, einschließlich Deklarationen, Tests sowie optionaler und verschachtelter Komponenten. Nur generierte `dist`-Verzeichnisse und Abhängigkeiten sind ausgeschlossen. Neue Komponenten benötigen keinen Referenzlisteneintrag.

NodeNext-Auflösung sowie ES2024- und DOM-Bibliotheken unterstützen Server- und Browserverträge. `@cognis/core` verweist auf die Quellen dieses Checkouts. Importiertes eigenes JavaScript liefert mit `allowJs` abgeleitete Typen; `checkJs` bleibt deaktiviert. Dies ist keine vollständige JavaScript-Prüfung. Komponentenkonfigurationen begrenzen die zentrale Prüfung nicht.

Abdeckungstests vergleichen die Compiler-Dateiliste mit dem nicht leeren Quellbestand, führen den echten npm-Befehl mit statischen Testdaten aus, erkennen Produktions- und Testfehler getrennt und prüfen wiederholte fehlerfreie Läufe ohne Dateiausgabe.

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

## Konfiguration

| Variable                       | Standard           | Beschreibung                                                              |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Pfad zur Datei mit dem API-Token für authentifizierte `cognisctl`-Befehle |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Zum Entdecken von Modul-Unterbefehlen                                     |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Optionale Pfadliste für Gateway-Unterbefehle                              |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Optionale Pfadliste für Adapter-Unterbefehle                              |
