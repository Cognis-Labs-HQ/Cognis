# Calendar Share Links

**Feature Branch:** copilot/fix-calendar-functionality

## Multiple links return to the popup

Calendar edit popups now keep every generated share link instead of replacing the
previous result. Each entry is rendered as its own collapsible block with the
link name plus separate CalDAV and ICS copy fields, so several feeds can be
managed without losing older exports.

## Private links now include passphrases

Private calendar shares now generate a dedicated passphrase for each link. The
popup shows that passphrase beside the exported URLs, and the share endpoints
accept it for CalDAV and ICS access without requiring a Cognis bearer token.

## Share links expire again

Generated links once again honour the selected expiry period and stop resolving
after that deadline passes. Public calendars now also issue distinct share-link
URLs, so every generated entry can expire independently.

## Shared-user cards fit the new controls

Each shared-user entry now keeps the profile card, permission picker, and expiry
picker on the same row with a compact close button pinned to the top-right
corner. Permission changes now patch only the field that changed, which avoids
the bad request response that appeared while flipping access between read-only
and read/write.

## Stale shared calendars clean up immediately

When a calendar share is deleted or expires, the shared calendar now disappears
from the recipient's calendar list on their very next refresh. A handshake runs
each time the recipient loads their calendars and removes any entry whose
backing share record is gone.

## Permission changes no longer reset on re-share

Re-adding a previously shared user no longer resets an upgraded permission back
to read-only. The existing permission is preserved, so an owner can safely
re-invite a user without losing a write grant they set earlier.

## Shared-calendar events no longer show the calendar picker popup

Accepting an event that already lives in a shared calendar no longer opens the
"Add Accepted Event To" calendar picker popup. The response is recorded directly
against the shared calendar, matching the behaviour that was already intended.

## Declining an event removes the decliner permanently

When a user declines an event (including an entire recurring series via
Respond All), they are removed from the attendee list of every affected
occurrence. The event no longer appears in their calendar or pending-event list
unless the organiser explicitly re-invites them.

## Pending Events buttons match the response popup style

The quick-response buttons in the Pending Events section now use the same
outlined button style and hover animation as the event composer's response
section — green for accept, red for decline, and bordered neutral for tentative.

## Pending Events updates instantly on response

Clicking a quick-response button in the Pending Events section now removes the
item from the list immediately, without waiting for the network request to
complete.

## Upcoming events no longer show events that have already passed

Pending calendar invitations for events whose end time has already passed are
now excluded from the invitations list. Previously, past events with a pending
response could still appear in the upcoming section even after they were over.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/4137bffbc99535676bf8d9a32060aa302556c333
