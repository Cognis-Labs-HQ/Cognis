# Calendar Client Sharing

## Clear client metadata

Calendar feeds now publish the calendar name and read-only or read-write state, while CalDAV discovery retains the authenticated share address.

## Read-write CalDAV shares

Calendar clients can create, edit, and delete events through read-write link shares and authenticated user shares. Read-only shares continue to reject changes.

## Consistent required fields

Private share passwords now use the standard form builder required marker and native field validation without separate warning messages.
