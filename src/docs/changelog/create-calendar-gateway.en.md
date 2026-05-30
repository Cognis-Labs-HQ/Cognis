# Calendar Upgrade

## Persistent calendar storage

The calendar gateway now persists calendars, events, and attendee responses through
a DB-backed store when the DB executor capability is available. Calendar routes now
support single-event read, update, delete, attendee response handling, and invited
internal-user copies through an automatic Invited calendar.

## Richer calendar workflows

Calendar UI popups now support viewing, editing, deleting, and responding to
events, including recurrence and free/busy controls plus overlap warnings. The
calendar views render richer event badges, the dashboard shows upcoming calendar
events, translations were expanded, and gateway tests now cover special invited
calendars, event updates, and mirrored-copy deletion.

## Fix event popup stuck open when opened from URL

When the calendar page is loaded with an `eventId` query parameter, the event
detail popup can now be closed normally. Previously the close action was silently
dropped due to a null-check mismatch in the `onAction` handler — the popup
implementation converts the `"close"` action id to `null` before invoking
`onAction`, but the handler was checking for the string `"close"`. The guard now
checks for `null`, so the popup dismisses correctly and the page loading indicator
no longer spins indefinitely after a direct-link page load.

## Click calendar to edit

Each calendar in the sidebar toolbar is now a single interactive element: clicking
it opens the edit popup directly. The separate pencil edit button that previously
appeared beside each calendar name has been removed.

## Calendar UI refinements

The calendar view controls are now a single-line toolbar — navigation buttons and the
current period label sit on the left, and the view switcher (Day / Week / Month / Year)
is aligned to the right. The week view adds an ISO week number after the month and year
label. In month view the per-day event counter is gone; up to three events are shown
inline and a "…" indicator appears when more events are present. In the year view,
days with events are now shaded with a stronger contrasting colour for easier scanning.
The week-axis corner cell now uses the same background as the time-slot labels so the
axis looks continuous. February's year-view month card no longer stretches taller than
the other months.

## Named share links with no limit

The calendar share UI now accepts an optional name for each generated link, making it
easy to tell links apart when multiple are created. There is no longer any artificial
limit on the number of share links that can be generated for a calendar — every new link
is shown in the popup and remains accessible until it expires.
