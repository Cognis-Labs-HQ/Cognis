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

## Isolierte Testzugangsdaten

`npm test` und `npm run ci:test` erstellen für jeden Lauf ein temporäres Tokenverzeichnis und für jeden Testprozess eine eigene beschreibbare Datei. Eine statische Vorabinitialisierung setzt den Pfad vor dem Laden der Testmodule und ignoriert geerbte produktive Tokenspeicherpfade. Tests dürfen anschließend ihren eigenen Pfad für Neustart- oder Fehlerfälle überschreiben. Nach erfolgreicher oder fehlgeschlagener Ausführung des Kindprozesses entfernt der Teststarter sein temporäres Verzeichnis und leitet reguläre Beendigungssignale weiter. Erzwungener Prozessabbruch oder Hostausfall kann temporäre Dateien hinterlassen, die das Betriebssystem bereinigen muss. Die produktive Tokenpersistenz bleibt unverändert und verweigert bei Fehlern den Erfolg.

## Interaktive CLI-Eingaben

Interaktive Befehle benötigen Terminals für stdin und stderr. stdout kann umgeleitet werden, um nur das Endergebnis zu speichern; Eingabeaufforderungen und Fortschritt bleiben auf stderr. Fortschrittsmeldungen pausieren während der Eingabe und werden danach fortgesetzt. Jedes Feld kennzeichnet sichtbare oder verborgene Eingaben. Vom zuständigen Befehl ausdrücklich freigegebene Benutzernamen und Rollen sind sichtbar; Passwörter, Token und nicht deklarierte Felder bleiben verborgen. Jede Eingabe mit Enter absenden oder mit Strg-C abbrechen. Endet die Eingabe vor dem Absenden, schlägt der Vorgang fehl, ohne den Befehl auszuführen. Skripte und umgeleitetes stdin müssen die dokumentierten Argumente verwenden; `--help` erklärt die Verwendung. Terminalmeldungen wählen Englisch, Deutsch, Indonesisch oder Japanisch anhand von `LC_ALL`, `LC_MESSAGES` oder `LANG`, mit Englisch als Rückfallsprache.

## Verträge für Befehlseingaben

HTTP-Befehle verwalten ihr Eingabeschema unabhängig von der Hilfegruppe. Die Hilfe zeigt Pfadargumente und JSON-Felder für Anfragetext und Abfrage mit Pflichtkennzeichnung. Ohne Argumente werden alle deklarierten Eingaben gemeinsam abgefragt. Teilweise angegebene Argumente müssen erforderliche JSON-Felder enthalten; unvollständige Eingaben scheitern vor der Befehlsanfrage. `cognisctl tfa:preferences:set <username> '{"methodIds":["<configured-method-id>"]}'` legt beispielsweise die bevorzugte Methodenreihenfolge eines bestehenden Benutzers fest. Verwenden Sie die für den Benutzer gemeldeten Methoden-IDs statt Anzeigenamen. Die interaktive Eingabe fragt Benutzername und kommagetrennte Methodenreihenfolge ab. Sie richtet keine neue TFA-Methode ein und ändert keine Berechtigungsanforderungen.

Befehlsanbieter können `wizardFields` für integrierte Argumentabfragen und `sensitive` für jedes `WizardField` einschließlich HTTP-Anfragetext- und Abfragefeldern angeben. Ohne Angabe bleibt die Eingabe verborgen; nur `sensitive: false` erlaubt die Anzeige. Passwörter, Token und beliebiges JSON müssen verborgen bleiben. Gewöhnliche Felder dürfen nur bei bekanntem Inhalt sichtbar sein. Feldnamen und Anbieter-IDs bestimmen niemals die Vertraulichkeit. Fehler bei ungültigem JSON wiederholen keine Eingabewerte.

Pflichtfelder benötigen einen Wert, keine gefüllte Sammlung: `[]` und `{}` bleiben gültig, wenn der deklarierte Typ sie erlaubt. Listen können als kommagetrennte Werte oder JSON-Zeichenfolgenarray eingegeben werden; `[]` leert die bevorzugte Reihenfolge. Zahlen müssen endlich sein, boolesche Werte eine eindeutige Wahr/Falsch-Auswahl. Deklarierte Typen werden vor der Befehlsanfrage geprüft. Zeichenfolgen einschließlich Passwörtern behalten führende und abschließende Leerzeichen. IDs und fachliche Regeln prüft weiterhin die zuständige API.

JSON für den gesamten Anfragetext muss sowohl interaktiv als auch explizit ein Objekt sein. Ein explizites `{}` wird unverändert gesendet; übersprungene optionale Eingaben bleiben ausgelassen. Erforderliche Abfragefelder werden ebenfalls erfasst und geprüft. GET/DELETE verwenden `[query-json]`; POST/PUT mit deklarierten Abfragefeldern verwenden `[body-json] [query-json]` nach den Pfadargumenten. Namen müssen über Pfad-, Anfragetext- und Abfragefelder hinweg eindeutig sein. Mehrdeutige Schemata scheitern bei der Registrierung vor Eingabeaufforderungen oder Übertragung.

Definierte Abfragewerte werden immer kodiert, auch eine explizite leere Zeichenfolge als `key=`. Nur ausgelassene Werte werden übersprungen.
