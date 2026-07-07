# Share Utility

## Add a Share Gateway

Cognis now includes a dedicated Share gateway that owns public share-token minting, listing, revocation, and resolution. The gateway registers canonical share flows, persists share tokens in the DB, and exposes a public `/share/:token` page backed by the standard page composer with a minimal shell.

## Share Meetings

The Jitsi Meet module now contributes share flow hooks for meeting resources, exposes meeting-share management routes, and renders a share button in the meeting stage. Meeting owners can generate expiring share links, copy them from a popup, and revoke them later.
