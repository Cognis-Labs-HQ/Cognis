# Technical Reference

The public interfaces and operational rules of Calendar.

## Interfaces

Authenticated /api/v1/calendar/calendars supports GET and POST; calendars/:id supports PATCH and DELETE. calendars/:id/events supports GET and POST, with event GET, PATCH and DELETE handled under /api/v1/calendar/calendars/:calendarId/events/:eventId.

## Configuration

Calendar resources define name, visibility and event data. Reminder preferences and account status use Calendar-owned controls; ICS and CalDAV adapters register their own export interfaces.

## Behavior

### Share delivery

Calendar contributes to the Share gateway through `ctx` flow hooks and capabilities. User-recipient delivery materializes a recipient-owned shared calendar and returns a generic navigation URL plus one-time localized success feedback. Passwords remain owned by Share and are retrieved from the keyring under the canonical share identifier.

### Public share renderer

Calendar contributes `/static/gateways/calendar/ui/share-renderer.js` as the `mountScriptUrl` for calendar link shares. Share passes the resolved calendar payload, granted capabilities, scoped guest token, translations, and abort signal to `mount(root, options)`. The adapter renderer mounts a single calendar card with day, week, month, and year switching and the standard timeslot table; it never loads the recipient's other calendars or dashboard controls. The calendar fits the viewport while retaining a usable minimum height, matching the signed-in Calendar page. Read shares display events. `calendar:write` shares can create, edit, and delete events through `/api/v1/calendar/shared/:calendarId/events` with the scoped guest token.

### Calendar interaction boundary

The signed-in Calendar page delegates view, period, and timeslot actions from its persistent page root so composer rerenders cannot detach controls. Event creation first filters all calendars with the standard writable-calendar rule; when no destination remains, it shows the localized no-writable-calendars toast instead of opening the form. Public writable shares authenticate event mutations with their scoped guest token.

### Share shell integration

Calendar follows the proven meeting-share lifecycle: Share clears its loading composer and passes the page root, resolved context, translations, and abort signal to Calendar. Calendar then owns a full `createPageComposer` page with the standard header, theme control, and footer but no account navigation. Its single calendar element imports form, popup, timestamp, and view dependencies directly, while event mutations authenticate with the supplied scoped guest token.

### Availability status

Calendar events update a user’s availability when they start or when an event is created over the current timeslot. A manual status selected after that activation takes precedence until another event starts. Users can disable calendar-driven status updates under User Settings → General.

### Cancel Old Calendar Loads

Leaving Calendar stops obsolete startup work before it updates the page or URL. The route signal reaches the page composer, and delayed calendar, event and invitation responses cannot rebuild a destination that has already been replaced. Cancelled startup does not show a late load-failure toast or restart the availability timer.

### Faster Calendar Startup

Calendar starts invitation discovery alongside the calendar-list request and loads events as soon as that list is ready. Page construction still waits for the required reads. Invitation failures keep the existing empty-invitation behavior, and every navigation requests fresh data. Cancellation checks prevent delayed results from constructing an obsolete page.

### Reminder Selection

Select several reminders using the standard visible checkboxes. Each selection remains visible and is saved together. Removing every selection disables reminders, including when the calendar has defaults. Existing custom reminder offsets remain available when editing.

On creation, omitted `reminderOffsetsMinutes` uses calendar defaults; an explicit empty array disables reminders. Updates that omit the field preserve the existing selection.

### Offline assets and Calendar

See the [shared contract](/docs/features/technical) for this behavior.

### Durable Queued Results

Queued event creation and later edits appear in cached lists and detail popups. Concurrent submissions share one request. Optional activity, availability or view-refresh failures cannot turn a persisted event into a failed creation. Replay uses the same event UUID and current server authorization.

### Offline Status Styles

The Calendar provider prepares the lazy event-status stylesheet for first use offline. Shared popup, toast and secret-visibility styles are prepared by the host, so opening a cached event does not depend on opening its details online.

### Runtime Request Safety

Calendar registers its notification category during bootstrap completion after providers become available. Runtime handlers use registered delivery capabilities rather than registering categories during requests.

Adapter contract registration follows [the shared gateway bootstrap contract](/docs/gateways).

### Share Delivery

See the [shared contract](/docs/gateways/share/technical) for this behavior.

### Lifecycle Boundaries

See the [shared contract](/docs/gateways/share/technical) for this behavior.

### Owned Browser Actions

Guest Calendar reads and mutations use the lifecycle-owned `calendar:sharedClient` capability and named `calendar:shared:*` flows. Requests retain explicit guest authority, combine page/provider cancellation, and never enter the account outbox. Consumers do not construct the shared endpoint.

Calendar discovers `meetings:createMeeting` from the active browser provider. The provider owns its creation request and destination; Calendar resolves a valid HTTP(S) URL for the event without knowing a module ID or route. Missing providers fail closed and the meeting toggle remains unavailable offline.

### Responsive Workspaces

Narrow Calendar panels show an agenda containing every event and the selected date, with a compact view selector and date jump. Wide panels retain calendar grids. The date field reaches empty dates without scrolling through a month. Shared calendars use the same presentations and enforce read-only access.

Date jumps and native view selection use one Calendar-owned control binding for both account and shared pages. Invalid inputs leave the current view unchanged, and the page lifetime removes its listeners.

### Readable Mobile Content

Calendar retains usable space for agendas and time grids on short screens while scrolling its events internally. The Add Event icon beside each date provides a 44px touch target and an accessible label.

Calendar sidebar rows remain menu entries, and the New Calendar control retains a 44px touch target with theme-colored hover feedback.

Shared-calendar period headings follow the current date and view through responsive redraws.

View buttons update their visible selection and pressed state together for every date presentation. View buttons keep their visible and pressed selection states synchronized.

### Typed Calendar Boundaries

Calendar event, persistence, bootstrap and adapter HTTP contracts now describe the implemented behavior. ICS and CalDAV retain their existing permissions, passphrase handling and feed formats.

### Credential Scope

Account operations require verified account sessions. Shared-resource operations explicitly verify guest credentials and recheck the current grant before applying resource permissions. Account names never determine credential type. Revoked or expired access is denied.

## Security

Calendar mutations require owned or delegated edit access. Share resolution checks current scope, expiry and protection; reminder delivery uses its bootstrap-registered notification category rather than registering during requests.

## Reference

### Technical Specification

| Page / surface | Guide          | Access         |
| -------------- | -------------- | -------------- |
| `/calendar`    | Calendar Guide | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.

Date navigation highlights the visible date controls even with no events. Event planning highlights one actual creation slot rather than repeating the whole calendar.

The date and event-creation steps use the controls in the active Calendar presentation. See [Calendar](/docs/gateways/calendar) for agenda and grid behavior.
