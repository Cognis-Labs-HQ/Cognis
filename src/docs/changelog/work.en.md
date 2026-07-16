# Guest presence identity fixes

## Guest display names load without profile errors

Share guests now receive their generated guest display name through the same session identity path used by the dashboard shell, avoiding profile lookup errors for temporary users.

## Stale whiteboard presence is hidden promptly

Whiteboard presence now ignores entries whose heartbeat has aged out, so abruptly disconnected guest sessions disappear instead of lingering as active participants.
