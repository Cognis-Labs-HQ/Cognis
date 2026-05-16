# Jitsi-Meet-Modul-Grundlage

## Zusammenfassung

Ein neues Jitsi-Meet-Modul mit konfigurierbaren Instanz-Einstellungen, Meeting-Persistenz, teilnehmergebundenen Zugriffskontrollen, Meeting-Sitzungsstatus-APIs, eigener Meetings-Seite und Administrationsüberwachung wurde hinzugefügt.

Nachfolgende Verbesserungen:
- Das Layout der Meetings-Seite wird vollständig durch den Composer gesteuert: Das Teilnehmer-Panel ist oben in voller Breite; Meeting-Fenster und Chat nehmen jeweils genau die halbe verfügbare Rasterbreite ein (`gridSize.max: 'half'`).
- „Meeting Overlay" wurde durchgängig in „Meeting-Fenster" umbenannt.
- Die Tabelle „Verfügbare Teilnehmer" wird beim Laden der Seite mit allen sichtbaren Benutzern vorbelegt.
- Die Teilnehmersuche wurde durch ein Popup ersetzt (entspricht der „Neues Gespräch"-UX in Nachrichten).
- Neuer Endpunkt `GET /api/v1/modules/jitsi-meet/participants?q=` liefert sichtbare Profile (alle bei leerem `q`, gefiltert sonst).

## Geänderte Dateien / Komponenten

- `src/modules/jitsi-meet/*` (neue Modul-API, Store, UI, i18n, Doku)
- `src/modules/routes/module-extensions.ts` (Erweiterungen für Modul-UI-/Capability-Registrierung)
- `src/api/server.ts` und `src/api/main.ts` (Verdrahtung für Modul-Capability-Provider)
- `src/adapters/social/messages/*` (Capability zur Auflösung/Wiederverwendung von Gruppenchat-URLs)
- `src/ui/app/administration/index.js` (Unterstützung für Modul-Konfigurations-Popup)
- `src/ui/languages/*/strings.xml` (neue wiederverwendbare Meeting-Keys)

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
