# Jitsi-Meet-Modul (1:1-Sitzungen)

## Zusammenfassung

Das selbstständige Modul `jitsi-meet` unter `src/modules/jitsi-meet` wurde hinzugefügt. Es enthält 1:1-Meetings, eine administrativ konfigurierbare Jitsi-Basis-URL, Laufzeit-Verknüpfung mit nativen Cognis-DM-Räumen sowie Picture-in-Picture über Document PiP (wenn verfügbar).

## Geänderte Dateien / Komponenten

- `src/modules/jitsi-meet/api/index.js` — API-Routen für Einstellungen, Session-Erstellung und Teilnehmer-Preflight-Prüfungen.
- `src/modules/jitsi-meet/api/store.js` — datenbankgestützte Speicherung von Einstellungen und Meetings mit FK-Teilnehmerfeldern.
- `src/modules/jitsi-meet/ui/app.js` — Meetings-Seite mit Kontaktsuche, Raumstart, nativer Chatraum-Auflösung und PiP-Aktionen.
- `src/modules/jitsi-meet/ui/admin-section.js` — Admin-Modulbereich zur Pflege der Jitsi-Basis-URL.
- `src/modules/jitsi-meet/ui/navbar.js` — Navbar-Beitrag für `/meetings`.
- `src/modules/jitsi-meet/languages/*/strings.xml` — modulbezogene lokalisierte UI-Texte.
- `src/modules/jitsi-meet/docs/index.*.md` — Moduldokumentation in allen unterstützten Dokumentsprachen.

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/805d8f0
