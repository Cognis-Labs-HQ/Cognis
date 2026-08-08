# Share Popups Restored

## Consistent share popup

Whiteboards now open the Share gateway's drop-in popup with their resource identifier and capabilities, following the same gateway integration used by other components. The gateway remains responsible for share methods and token requests.

## Presence avatars stay in place

Page-presence profile images now receive their presentation from the shared presence stylesheet, so they remain toolbar avatars instead of rendering as unstyled image layers over the whiteboard canvas.

## Keep share guests authenticated

Opening a whiteboard share link now preserves its scoped guest session. Cognis no longer checks the temporary guest identity as a regular user account, clears its token, or reports that the account was deleted.

## Load guest-aware dashboard data

Shared pages now use the Share gateway's guest-session capability when choosing profile and dashboard requests, preventing irrelevant account-only requests from failing while a whiteboard is open.
