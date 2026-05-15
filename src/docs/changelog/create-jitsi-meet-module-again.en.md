# Jitsi Meet Module (User-to-User Sessions)

## Summary

Added a self-contained `jitsi-meet` module under `src/modules/jitsi-meet` with user-to-user meeting sessions, admin-configurable Jitsi base URL, runtime linkage to native Cognis DM rooms, and Picture-in-Picture support via Document PiP where available.

## Changed Files / Components

- `src/modules/jitsi-meet/api/index.js` — module API routes for settings, session creation, and participant pre-flight checks.
- `src/modules/jitsi-meet/api/store.js` — DB-backed settings and meeting persistence with participant FK columns.
- `src/modules/jitsi-meet/ui/app.js` — meetings page logic, contact search, room launch, native chat room resolution, PiP actions.
- `src/modules/jitsi-meet/ui/admin-section.js` — Administration module settings panel for Jitsi base URL.
- `src/modules/jitsi-meet/ui/navbar.js` — dashboard navbar link contribution for `/meetings`.
- `src/modules/jitsi-meet/languages/*/strings.xml` — module-localized UI strings.
- `src/modules/jitsi-meet/docs/index.*.md` — module documentation in all supported doc languages.

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/805d8f0
