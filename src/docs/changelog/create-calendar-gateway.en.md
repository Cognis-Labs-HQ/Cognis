# Calendar Upgrade

## Multi-calendar events stay visible

Refreshing the calendar page no longer hides events that belong to non-default
calendars. The main calendar view, pending invitations, and upcoming summaries
now continue to aggregate events from every available calendar so accepted and
manually created secondary-calendar events remain available after reload.

## Pending invites in Upcoming Summary

Upcoming Summary now includes a Pending Events subsection with quick Accept,
Tentative, and Decline actions. Accepting an invite now asks which calendar
should receive the event, and the old share-link generator no longer appears in
the calendar edit popup.

## Calendar invite notifications restored

Calendar invite and response notifications now resolve the notify capability at
request time instead of only during calendar gateway bootstrap. This prevents
boot order from silently disabling deliveries when the notify gateway loads
after calendar.

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

## Time format preference

Settings now include a 12-hour / 24-hour clock preference under Date & Time. Shared
timestamp formatting uses that setting so calendar times, message timestamps, clocks,
and other time-of-day labels stay consistent with the user's chosen format.

## Sleeker calendar slots

Week and day slots now keep consistent spacing while rendering events as stacked cards
with anchored add buttons instead of expanding unevenly. Slot clicks now create events
anywhere that is not already occupied by an event button or add button, which removes
the dead zones that made event creation unreliable.

## Calendar event popup on creation

Newly created calendar events now open their detail popup immediately after save,
without requiring a page refresh. The week view participant chips now display as
vertical avatar bubbles matching the Jitsi meeting participant style.

## Jitsi Meet – Scheduled Meetings admin section

The Jitsi Meet administration page now shows a second table, "Scheduled Meetings",
listing meetings that have been created for upcoming calendar events but have not
yet been started or ended. The event creator is always included as a participant
when a meeting is generated from a calendar event.

## Calendar UI polish

The calendar popup now closes automatically after a calendar is deleted. Hovering
over an empty time-slot now shows a clearly visible tinted background so the
clickable area is obvious. The all-day row in the week view now also shows the
pointer cursor on hover, matching the timed slots. Pending event invitations have
been moved into the My Calendars toolbar section, removing the duplicate
"Upcoming Events" label from the sidebar. Event cards in all views now correctly
show a tinted background in the calendar colour, including month-grid compact
cards.

## Event popup respects 24-hour setting

The event detail popup now correctly honours the 12/24-hour clock preference from
Settings. Previously the start and end times in the popup were always rendered in
12-hour format regardless of the user's chosen time format.
