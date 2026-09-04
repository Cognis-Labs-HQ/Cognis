# Leere Inbox: Löschen gesperrt

**Feature-Zweig:** feature-disable-delete-notifications-button-when-empty

## Zusammenfassung

Der interne Benachrichtigungs-Posteingang deaktiviert jetzt die destruktive „Alle löschen“-Schaltfläche, wenn keine Benachrichtigungen vorhanden sind. Dadurch werden unnötige Bestätigungsdialoge verhindert und der Aktionszustand bleibt mit dem Posteingang synchron.

## Geänderte Dateien / Komponenten

- `src/adapters/notify/internal/ui/navbar-plugin.js` — Hält die „Alle löschen“-Schaltfläche bei leerem Posteingang deaktiviert und schützt den Klickpfad davor, ohne Benachrichtigungen ein Bestätigungs-Popup zu öffnen.
- `src/adapters/notify/internal/ui/notifications.css` — Verhindert den destruktiven Hover-Stil, solange die „Alle löschen“-Schaltfläche deaktiviert ist.
- `src/ui/tests/notification-followups.test.js` — Ergänzt Laufzeitabdeckung, die einen leeren Posteingang rendert und verifiziert, dass der „Alle löschen“-Klickpfad kein Popup aufruft.
- `src/adapters/notify/internal/package.json` und `src/docs/versions.en.md` — Erhöht die Version des Internal-Notification-Adapters auf `0.5.3`.

## Änderungen

- [96d6616](https://github.com/Cognis-Labs-HQ/Cognis/commit/96d6616)
