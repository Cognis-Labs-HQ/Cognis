# Calendar Gateway

## Share delivery

Calendar contributes to the Share gateway through `ctx` flow hooks and capabilities. User-recipient delivery materializes a recipient-owned shared calendar and returns a generic navigation URL plus one-time localized success feedback. Passwords remain owned by Share and are retrieved from the keyring under the canonical share identifier.

## Public share renderer

Calendar contributes `/static/gateways/calendar/ui/share-renderer.js` as the `mountScriptUrl` for calendar link shares. Share passes the resolved calendar payload, granted capabilities, scoped guest token, translations, and abort signal to `mount(root, options)`. The adapter renderer mounts a single calendar card with day, week, month, and year switching and the standard timeslot table; it never loads the recipient's other calendars or dashboard controls. Only the timeslot grid scrolls vertically, matching the signed-in Calendar card. Read shares display events. `calendar:write` shares can create, edit, and delete events through `/api/v1/calendar/shared/:calendarId/events` with the scoped guest token.
