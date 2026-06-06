# Calendar Share Links

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
