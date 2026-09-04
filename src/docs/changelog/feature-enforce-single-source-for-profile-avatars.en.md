# Consistent profile avatars

**Feature Branch:** feature-enforce-single-source-for-profile-avatars

## One profile-owned avatar source

Profile avatar loading, fallback rendering, initials generation, and initials colours now come from the Profile adapter's UI CTX capability. UI callers query that adapter contribution directly through CTX instead of introducing a profile abstraction in core reuse, so names produce the same avatar everywhere.

## Remaining consumers audited

Messages, Calendar, Jitsi Meet, Nextcloud Whiteboard, Share, presence displays, and classroom avatars now reach the Profile adapter only through the CTX capability. The obsolete Social gateway re-export was removed, and a regression test prevents new initials implementations, direct profile-file fetches, or imports of the legacy provider.

## Navbar avatar remains visible in Study

The Profile navbar plugin now contributes its avatar provider through UI CTX instead of importing layout state. Dashboard shell reuse also preserves an already-resolved avatar while plugins load, so navigation among Study subpages no longer replaces the profile image temporarily.

## Messages load profile avatar support before rooms render

Direct Messages page loads now wait for registered navigation contributions, ensuring the Profile avatar capability is available before rooms with avatars or initials are rendered.

## Study classrooms bind the Profile UI context correctly

Classroom pages now import the UI context as executable module code, so teacher and occupied-seat initials render without a missing-variable error.

## Commits

- [fa7325e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa7325e7709ea2942c3ce560b033429297e5e8f7)
