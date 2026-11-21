# Technical Reference

The public interfaces and operational rules of Calendar Import and Export.

## Interfaces

`GET /api/v1/calendar/ics/export` — `calendarId`

`POST /api/v1/calendar/ics/import` — `calendarId`, `ics`

## Configuration

No additional adapter settings are exposed. Configuration and permissions come from the Calendar gateway and the selected calendar.

## Behavior

Export reads an owned calendar and returns an ICS attachment. Import requires both `calendarId` and nonempty `ics` text, then imports through the Calendar gateway.

## Security

Export and import require an authenticated account with the corresponding calendar access. Shared feeds validate their token, expiry and current permission before reading or changing events.

## Reference

- [src/adapters/calendar/ics/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/manifest.json)
- [src/adapters/calendar/ics/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/package.json)
- [src/adapters/calendar/ics/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/index.ts)
