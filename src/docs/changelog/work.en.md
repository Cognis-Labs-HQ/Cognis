# Whiteboard Share Fixes

## Fixed whiteboard share guests

Whiteboard share sessions now use the Share gateway guest profile generated for the link, so guests get stable generated names without triggering visible-profile requirements.

## Fixed share revocation

Whiteboard share deletion now survives other modules' revoke hooks and sends the same owner context as meeting shares.

## Added middle-click panning

The whiteboard canvas now supports middle-click dragging to pan around expanded canvas space without changing tools or selecting objects.
