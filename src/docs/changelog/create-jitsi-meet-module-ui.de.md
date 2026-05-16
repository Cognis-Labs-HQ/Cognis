# Jitsi-Meet-Modul-Grundlage

## Zusammenfassung

Ein neues Jitsi-Meet-Modul mit konfigurierbaren Instanz-Einstellungen, Meeting-Persistenz, teilnehmergebundenen Zugriffskontrollen, Meeting-Sitzungsstatus-APIs, eigener Meetings-Seite und Administrationsüberwachung wurde hinzugefügt.

## Geänderte Dateien / Komponenten

- `src/modules/jitsi-meet/*` (neue Modul-API, Store, UI, i18n, Doku)
- `src/modules/routes/module-extensions.ts` (Erweiterungen für Modul-UI-/Capability-Registrierung)
- `src/api/server.ts` und `src/api/main.ts` (Verdrahtung für Modul-Capability-Provider)
- `src/adapters/social/messages/*` (Capability zur Auflösung/Wiederverwendung von Gruppenchat-URLs)
- `src/ui/app/administration/index.js` (Unterstützung für Modul-Konfigurations-Popup)
- `src/ui/languages/*/strings.xml` (neue wiederverwendbare Meeting-Keys)

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
