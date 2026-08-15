# Consistent profile avatars

## One profile-owned avatar source

Profile avatar loading, fallback rendering, initials generation, and initials colours now come from the Profile adapter's UI CTX capability. UI callers query that adapter contribution directly through CTX instead of introducing a profile abstraction in core reuse, so names produce the same avatar everywhere.

## Remaining consumers audited

Messages, Calendar, Jitsi Meet, Nextcloud Whiteboard, Share, presence displays, and classroom avatars now reach the Profile adapter only through the CTX capability. The obsolete Social gateway re-export was removed, and a regression test prevents new initials implementations, direct profile-file fetches, or imports of the legacy provider.

## Navbar avatar remains visible in Study

The Profile navbar plugin now contributes its avatar provider through UI CTX instead of importing layout state. Dashboard shell reuse also preserves an already-resolved avatar while plugins load, so navigation among Study subpages no longer replaces the profile image temporarily.
