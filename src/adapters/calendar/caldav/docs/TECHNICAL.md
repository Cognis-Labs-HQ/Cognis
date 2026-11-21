# Technical Reference

The public interfaces and operational rules of CalDAV.

## Interfaces

`GET /api/v1/calendar/caldav/calendars/:calendarId/export`

`/api/v1/calendar/caldav/public/:name`

`/api/v1/calendar/caldav/private/:token`

## Configuration

No additional adapter settings are exposed. Configuration and permissions come from the Calendar gateway and the selected calendar.

## Behavior

Export returns a subscription URL. Public calendars and private tokens use separate feed URLs. Shared event writes are limited by the share permission; this adapter does not create separate calendar-client accounts.

## Security

Export and import require an authenticated account with the corresponding calendar access. Shared feeds validate their token, expiry and current permission before reading or changing events.

## Reference

- [src/adapters/calendar/caldav/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/manifest.json)
- [src/adapters/calendar/caldav/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/package.json)
- [src/adapters/calendar/caldav/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/index.ts)
