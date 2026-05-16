# Jitsi Meet Module Foundation

## Summary

Added a new Jitsi Meet module with configurable instance settings, meeting persistence, participant-gated access checks, meeting session state APIs, a dedicated meetings page, and administration monitoring.

## Changed Files / Components

- `src/modules/jitsi-meet/*` (new module API, store, UI, i18n, docs)
- `src/modules/routes/module-extensions.ts` (module UI/capability registration enhancements)
- `src/api/server.ts` and `src/api/main.ts` (module capability provider wiring)
- `src/adapters/social/messages/*` (group chat URL resolution/reuse capability)
- `src/ui/app/administration/index.js` (module configure popup support)
- `src/ui/languages/*/strings.xml` (new reusable meeting keys)

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
