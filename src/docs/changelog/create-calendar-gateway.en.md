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
