# Share Utility

## Add a Share Gateway

Cognis now includes a dedicated Share gateway that owns public share-token minting, listing, revocation, and resolution. The gateway registers canonical share flows, persists share tokens in the DB, and exposes a public `/share/:token` page backed by the standard page composer with a minimal shell.

## Share Meetings

The Jitsi Meet module now contributes share flow hooks for meeting resources, exposes meeting-share management routes, and renders a share button in the meeting stage. Meeting owners can generate expiring share links, copy them from a popup, and revoke them later.

## Generic Share Links Popup

The share links popup has been extracted from the Jitsi Meet module into a generic `openShareLinksPopup` utility in `src/ui/reuse/share-links-popup.js`. It accepts API callback functions and label strings as parameters, making it reusable by any feature that needs to manage share links. The import now uses an absolute path, fixing a dynamic import fetch failure on the Meetings page.
