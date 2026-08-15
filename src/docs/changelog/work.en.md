# Consistent profile avatars

## One profile-owned avatar source

Profile avatar loading, fallback rendering, initials generation, and initials colours now come from the Profile adapter's UI CTX capability. Shared UI callers delegate to that capability instead of maintaining competing implementations, so names produce the same avatar everywhere.

## Remaining consumers audited

Messages, Calendar, Jitsi Meet, Nextcloud Whiteboard, Share, presence displays, and classroom avatars now reach the Profile adapter only through the shared CTX client. The obsolete Social gateway re-export was removed, and a regression test prevents new initials implementations, direct profile-file fetches, or imports of the legacy provider.
