# Calendar Gateway

## Share delivery

Calendar contributes to the Share gateway through `ctx` flow hooks and capabilities. User-recipient delivery materializes a recipient-owned shared calendar and returns a generic navigation URL plus one-time localized success feedback. Passwords remain owned by Share and are retrieved from the keyring under the canonical share identifier.

## Public share renderer

Calendar contributes `/static/gateways/calendar/ui/share-renderer.js` as the `mountScriptUrl` for calendar link shares. Share passes the resolved calendar payload, granted capabilities, scoped guest token, translations, and abort signal to `mount(root, options)`. Read shares render events; `calendar:write` shares additionally post new events to `/api/v1/calendar/shared/:calendarId/events` with the scoped guest token.
