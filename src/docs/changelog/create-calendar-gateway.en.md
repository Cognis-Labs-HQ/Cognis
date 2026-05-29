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
