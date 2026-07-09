# Share Utility

## Add a Share Gateway

Cognis now includes a dedicated Share gateway that owns public share-token minting, listing, revocation, and resolution. The gateway registers canonical share flows, persists share tokens in the DB, and exposes a public `/share/:token` page backed by the standard page composer with a minimal shell.

## Share Meetings

The Jitsi Meet module now contributes share flow hooks for meeting resources, exposes meeting-share management routes, and renders a share button in the meeting stage. Meeting owners can generate expiring share links, copy them from a popup, and revoke them later.

## Generic Share Links Popup

The share links popup has been extracted from the Jitsi Meet module into a generic `openShareLinksPopup` utility in `src/ui/reuse/share-links-popup.js`. It accepts API callback functions and label strings as parameters, making it reusable by any feature that needs to manage share links. The import now uses an absolute path, fixing a dynamic import fetch failure on the Meetings page.

## Fix Meetings Page Load Failure Caused by 401 on share-adapter.js

The static top-level import of `share-adapter.js` in the Meetings `app.js` was triggering
a 401 response at module parse time, before the user session could satisfy any auth check.
This aborted the import and prevented the entire `/meetings` SPA route from loading.
`share-adapter.js` is now fetched as a lazy dynamic import co-located with
`share-links-popup.js` inside the share button click handler, so it is never requested
until the user is in an authenticated session and deliberately opens the share popup.

## Remove Orphaned Jitsi Meet Files

The legacy `ui/app/index.js` and `ui/pages/meetings.html` files in the Jitsi Meet module were
orphaned by a prior refactor and never served to browsers. `index.js` contained a broken
import (`/static/reuse/page-composer.js` instead of `/static/reuse/page-composer/index.js`),
which would cause a load failure if the file were ever reached. Both files have been removed.

## Fix Calendar Invitation Test Date

The shared calendar event auto-invite test used a hardcoded event date (2026-06-16) that had
fallen in the past, causing `listInvitedPendingEvents` to filter it out and the assertion to fail.
The event date has been updated to 2030-06-16.

## Fix Public Share Links Blocked by Auth Check

The calendar gateway route handler used an overly broad `pathname.includes("/share")` check
that accidentally intercepted public share link URLs (`/share/shr_...`) and returned an
unauthorized error before the share gateway could serve the page. The check is now narrowed
to only match calendar-specific share API routes under `/api/v1/calendar/calendars/:id/share`.

## Fix Share Popup Label Input Focus

When the share-links popup opens, the label input field now receives focus automatically.
Previously, the close button (the first button in the popup DOM) was incorrectly focused,
preventing direct keyboard input into the label field.

## Add Flow-Oriented Guest Share Sessions

Share resolution now issues scoped guest access tokens and returns them to the share page, which temporarily swaps the token into the active API session and restores the prior token on unload. The Jitsi Meet share flow now mounts the real meetings UI via `share-mount.js` instead of a static card renderer, and share-guest route guards were added for meeting join/config/participants and read-only social room key/message access.
