# Jitsi-Meet-Modul und Meeting-Persistenz

## Zusammenfassung

- Ein eigenständiges Erweiterungsmodul `jitsi-meet` mit API- und UI-Einstiegspunkten wurde hinzugefügt.
- Persistente `meeting_rooms`-Einträge mit Teilnehmerdurchsetzung und wiederverwendbaren Raum-Schlüsseln wurden eingeführt.
- Grundlagen für das Classroom-Schema sowie ein Nachrichten-Integrationshook wurden ergänzt, damit Meetings automatisch einen Chatraum verknüpfen können.

## Geänderte Dateien/Komponenten

- `src/modules/jitsi-meet/` (neues Modul-Manifest, API, UI, Navbar-Plugin, Locale-Strings)
- `src/modules/routes/module-extensions.ts` (Weitergabe des Modul-API-Kontexts)
- `src/api/server.ts`, `src/api/main.ts`, `src/api/routes/ui/index.ts` (Capability-/Kontext-Verdrahtung und Modul-Navbar-/Static-Support)
- `src/adapters/study/classes/` (Classroom-Schema und Exposition der Classroom-Capability)
- `src/adapters/social/messages/` (Chatraum-Erstellungs-Capability für Modul-Integration)
- `src/ui/public/templates/dashboard-layout.html`, `src/ui/layouts/dashboard-layout.js`, `src/ui/languages/*/strings.xml` (Meetings-Navbar-Beschriftung und Auffindbarkeit)

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/6fb2d2deff0b75ea44536e458f4ef4a0bf56d708
