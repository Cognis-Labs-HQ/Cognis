# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von CalDAV.

## Schnittstellen

`GET /api/v1/calendar/caldav/calendars/:calendarId/export`

`/api/v1/calendar/caldav/public/:name`

`/api/v1/calendar/caldav/private/:token`

## Konfiguration

Es gibt keine zusätzlichen Adaptereinstellungen. Konfiguration und Rechte stammen vom Kalenderdienst und dem gewählten Kalender.

## Verhalten

Der Export liefert eine Abonnementadresse. Öffentliche Kalender und private Token verwenden getrennte Feed-Adressen. Schreibzugriffe auf geteilte Termine unterliegen den Freigaberechten; eigene Kalenderclient-Konten werden nicht angelegt.

## Sicherheit

Import und Export verlangen eine Anmeldung mit den entsprechenden Kalenderrechten. Geteilte Feeds prüfen Token, Ablauf und aktuelle Rechte vor dem Lesen oder Ändern von Terminen.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/calendar/caldav/`.
