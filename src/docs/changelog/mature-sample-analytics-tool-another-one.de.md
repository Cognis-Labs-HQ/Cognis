# Analytik in Administration

## Sample-Analytics-Modul ersetzt durch vollständigen Analytik-Bereich

Das Sample-Analytics-Modul wurde zu einem vollständigen Werkzeug für Benutzeraktivitätsanalysen
weiterentwickelt. Das bisherige Platzhalter-Dashboard-Element wurde entfernt.

## Analytik-Tab in Administration zeigt echte Benutzermetriken

Administration → Analytik zeigt zusammenfassende Statistikkarten (Gesamtnutzer, aktive Nutzer
in den letzten 7 Tagen, Neuregistrierungen im gewählten Zeitraum), ein Balkendiagramm
für den Registrierungstrend der letzten 7, 30 oder 90 Tage sowie eine Rollenverteilung
mit integrierten Prozentbalken.

## Interaktiver Zeitraumfilter aktualisiert Diagramme und Statistiken live

Ein Zeitraumfilter ermöglicht Admins den Wechsel zwischen 7-, 30- und 90-Tage-Fenstern.
Ein Klick auf Aktualisieren holt alle Daten neu ab und aktualisiert Statistikkarten,
Balkendiagramm und Ereignisprotokoll ohne Neuladen der Seite.

## API zum Aufzeichnen benutzerdefinierter Ereignisse

Ein neuer Endpunkt `POST /api/v1/modules/analytics/activity-log` erlaubt Admins das
Aufzeichnen benutzerdefinierter benannter Ereignisse (mit optionalen Metadaten) in der
Analytik-Ereignistabelle. Aufgezeichnete Ereignisse erscheinen im Ereignisprotokoll
des Analytik-Bereichs.

## Neue API-Endpunkte für Metriken und Zeitreihendaten

Drei admin-authentifizierte API-Routen ersetzen den bisherigen Stub-Endpunkt:
`/api/v1/modules/analytics/metrics` (Zusammenfassung und Rollenverteilung),
`/api/v1/modules/analytics/series` (tägliche Registrierungsreihe) und
`/api/v1/modules/analytics/activity-log` (Protokoll benutzerdefinierter Ereignisse).
