# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Kalenderimport und -export.

## Schnittstellen

`GET /api/v1/calendar/ics/export` — `calendarId`

`POST /api/v1/calendar/ics/import` — `calendarId`, `ics`

## Konfiguration

Es gibt keine zusätzlichen Adaptereinstellungen. Konfiguration und Rechte stammen vom Kalenderdienst und dem gewählten Kalender.

## Verhalten

Der Export liest einen eigenen Kalender und liefert einen ICS-Anhang. Der Import verlangt `calendarId` und nichtleeren `ics`-Text und erfolgt über den Kalenderdienst.

## Sicherheit

Import und Export verlangen eine Anmeldung mit den entsprechenden Kalenderrechten. Geteilte Feeds prüfen Token, Ablauf und aktuelle Rechte vor dem Lesen oder Ändern von Terminen.

## Referenz

- [src/adapters/calendar/ics/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/manifest.json)
- [src/adapters/calendar/ics/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/package.json)
- [src/adapters/calendar/ics/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/index.ts)
