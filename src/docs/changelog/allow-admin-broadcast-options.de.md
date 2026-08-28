# Modi und Zielgruppensteuerung

## Zusammenfassung

Fügt im Benachrichtigungsbereich ein neues, durch Admins konfigurierbares Rundsendungssystem hinzu, das zwei Ausspielungsmodi unterstützt: eine Leiste am Seitenanfang und ein Popup. Admins können Zielrollen, Start- und Enddatum, Bestätigungspflicht, Weiterleitungsverhalten beim Schließen sowie den Aktivierungsstatus festlegen.

Das Dashboard lädt nun ein Notify-Broadcast-Navbar-Plugin, das aktive Rundsendungen für die Rolle des angemeldeten Benutzers abruft und im konfigurierten Modus anzeigt.

## Geänderte Dateien / Komponenten

- `src/gateways/notify/notification-store.ts` — Broadcast-Persistenzschema und zustandsbezogene Speicherung pro Benutzer hinzugefügt.
- `src/gateways/notify/routes/notifications.ts` — Broadcast-APIs für Admin/Benutzer ergänzt (Erstellen/Liste, Aktivieren/Deaktivieren, aktiv abrufen, bestätigen, schließen).
- `src/gateways/notify/ui/admin-section.js` — Administrationsoberfläche zur Broadcast-Konfiguration und -Verwaltung hinzugefügt.
- `src/gateways/notify/ui/broadcast-navbar-plugin.js` — Neues Dashboard-Plugin zur Anzeige aktiver Broadcasts als Leiste oder Popup.
- `src/gateways/notify/ui/broadcast.css` — Stile für die Broadcast-Leiste.
- `src/gateways/notify/ui/languages/*/strings.xml` — Broadcast-i18n-Schlüssel in allen unterstützten Sprachen ergänzt.
- `src/gateways/notify/bootstrap.ts` — Broadcast-Navbar-Plugin registriert und Gateway-Registry-Version erhöht.
- `src/gateways/notify/manifest.json` und `src/docs/versions.en.md` — Version des Notification-Gateways auf `1.4.0` erhöht.
- `src/gateways/notify/routes/tests/notification-routes.test.ts` — Routentests für die neuen Broadcast-Endpunkte hinzugefügt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e14cbfc
