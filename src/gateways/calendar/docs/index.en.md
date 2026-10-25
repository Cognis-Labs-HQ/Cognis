# Calendar Gateway

## Share delivery

Calendar contributes to the Share gateway through `ctx` flow hooks and capabilities. User-recipient delivery materializes a recipient-owned shared calendar and returns a generic navigation URL plus one-time localized success feedback. Passwords remain owned by Share and are retrieved from the keyring under the canonical share identifier.

## Public share renderer

Calendar contributes `/static/gateways/calendar/ui/share-renderer.js` as the `mountScriptUrl` for calendar link shares. Share passes the resolved calendar payload, granted capabilities, scoped guest token, translations, and abort signal to `mount(root, options)`. The adapter renderer mounts a single calendar card with day, week, month, and year switching and the standard timeslot table; it never loads the recipient's other calendars or dashboard controls. Only the timeslot grid scrolls vertically, matching the signed-in Calendar card. Read shares display events. `calendar:write` shares can create, edit, and delete events through `/api/v1/calendar/shared/:calendarId/events` with the scoped guest token.

## Calendar interaction boundary

The signed-in Calendar page delegates view, period, and timeslot actions from its persistent page root so composer rerenders cannot detach controls. Event creation first filters all calendars with the standard writable-calendar rule; when no destination remains, it shows the localized no-writable-calendars toast instead of opening the form. Public writable shares authenticate event mutations with their scoped guest token.

## Share shell integration

Calendar follows the proven meeting-share lifecycle: Share clears its loading composer and passes the page root, resolved context, translations, and abort signal to Calendar. Calendar then owns a full `createPageComposer` page with the standard header, theme control, and footer but no account navigation. Its single calendar element imports form, popup, timestamp, and view dependencies directly, while event mutations authenticate with the supplied scoped guest token.

## Availability status

Calendar events update a user’s availability when they start or when an event is created over the current timeslot. A manual status selected after that activation takes precedence until another event starts. Users can disable calendar-driven status updates under User Settings → General.

## Cancel Old Calendar Loads

Leaving Calendar stops obsolete startup work before it updates the page or URL. The route signal reaches the page composer, and delayed calendar, event and invitation responses cannot rebuild a destination that has already been replaced. Cancelled startup does not show a late load-failure toast or restart the availability timer.

## Faster Calendar Startup

Calendar starts invitation discovery alongside the calendar-list request and loads events as soon as that list is ready. Page construction still waits for the required reads. Invitation failures keep the existing empty-invitation behavior, and every navigation requests fresh data. Cancellation checks prevent delayed results from constructing an obsolete page.

## Reminder Selection

Select several reminders using the standard visible checkboxes. Each selection remains visible and is saved together. Removing every selection disables reminders, including when the calendar has defaults. Existing custom reminder offsets remain available when editing.

On creation, omitted `reminderOffsetsMinutes` uses calendar defaults; an explicit empty array disables reminders. Updates that omit the field preserve the existing selection.

## Offline assets and Calendar

Calendar snapshots its calendar list, invitations and owned-event lists after verified authentication, with two background requests at a time. Cache invalidation refreshes those snapshots without blocking login. Cached events remain readable; event creation, edits, deletions, responses, status preferences and calendar edits enter the shared durable outbox. Pending creations and edits appear in cached event lists. Creation uses a stable operation UUID; a replay returns the existing event without another recurrence series or repeated invitation dispatch, and changed or cross-account reuse conflicts. Server authorization is checked on replay.

Calendar snapshots are tab-local and bounded to 4 MB/100 reads. The global outbox remains bounded to 1 MB/1,000 records/seven days. New recurring events show their first occurrence until server expansion. Creating calendar containers, generating meetings, share/password management and guest credentials require connectivity; share passwords are never buffered. Messages requires a cached room list and Study requires cached language/preference metadata before enabling offline navigation.
