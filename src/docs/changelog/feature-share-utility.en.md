# Share Utility

## Add a Share Gateway

Cognis now includes a dedicated Share gateway that owns public share-token minting, listing, revocation, and resolution. The gateway registers canonical share flows, persists share tokens in the DB, and exposes a public `/share/:token` page backed by the standard page composer with a minimal shell.

## Share Meetings

The Jitsi Meet module now contributes share flow hooks for meeting resources, exposes meeting-share management routes, and renders a share button in the meeting stage. Meeting owners can generate expiring share links, copy them from a popup, and revoke them later.

## Meetings page load fix

The share popup module is now loaded lazily when the user opens the share dialog instead of being eagerly imported at page load time. This prevents a failed share-popup fetch from aborting the entire meetings page module.
