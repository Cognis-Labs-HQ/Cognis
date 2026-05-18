# Permanenter Aktualisieren-Toast bei unterbrochenen API-Verbindungen

## Zusammenfassung

Es wurde ein permanenter Warn-Toast hinzugefügt, der Benutzer zum Aktualisieren der Seite auffordert, wenn authentifizierte API-Verbindungen aufgrund von Server-/Netzwerkunterbrechungen ausfallen (Netzwerkfehler oder wiederholbare 5xx-Antworten).

Der Page Composer setzt nun einen übersetzten gemeinsamen Aktualisierungshinweis, damit die Warnung auf Dashboard-Seiten lokalisiert bleibt.

## Geänderte Dateien / Komponenten

- `src/ui/reuse/api-client.js` — Fügt die gemeinsame Connection-Recovery-Toast-Logik und Prompt-Konfiguration hinzu.
- `src/ui/reuse/page-composer.js` — Registriert den übersetzten Connection-Recovery-Prompt beim Seitenstart.
- `src/ui/languages/en/strings.xml`
- `src/ui/languages/de/strings.xml`
- `src/ui/languages/id/strings.xml`
- `src/ui/languages/ja/strings.xml`
- `src/ui/reuse/tests/api-client.test.js` — Fügt Regressionstests für das permanente Aktualisieren-Toast-Verhalten hinzu.

## Commits

- https://github.com/le-firehawk/Cognis/commit/bbee24a
- https://github.com/le-firehawk/Cognis/commit/3b7bded
