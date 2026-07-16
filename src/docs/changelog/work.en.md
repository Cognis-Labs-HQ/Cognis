# Guest presence identity fixes

## Guest display names load without profile errors

Share guests now receive their generated guest display name through the same session identity path used by the dashboard shell, avoiding profile lookup errors for temporary users.

## Stale whiteboard presence is hidden promptly

Whiteboard presence now ignores entries whose heartbeat has aged out, so abruptly disconnected guest sessions disappear instead of lingering as active participants.

## Collaborative selection indicators

Whiteboard selections now appear for other active users with a highlighted outline and floating name label, sharing canvas object selection alongside pointer presence.

## Responsive polling and toolbar presence

Presence refreshes now use an adaptive polling helper that speeds up after activity and slows down while quiet, and the whiteboard toolbar provides a dedicated presence slot that is reattached if the toolbar rerenders.
