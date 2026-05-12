# Jitsi Meet Module and Meeting Persistence

## Summary

- Added a standalone `jitsi-meet` extension module with API and UI entry points.
- Introduced persisted `meeting_rooms` records with participant enforcement and room re-use keys.
- Added classroom schema foundations and a messages integration hook so meetings can auto-link a chatroom.

## Changed Files/Components

- `src/modules/jitsi-meet/` (new module manifest, API, UI, navbar plugin, locale strings)
- `src/modules/routes/module-extensions.ts` (module API context propagation)
- `src/api/server.ts`, `src/api/main.ts`, `src/api/routes/ui/index.ts` (module capability/context wiring and module navbar/static support)
- `src/adapters/study/classes/` (classroom schema and classroom capability exposure)
- `src/adapters/social/messages/` (chatroom creation capability for module integration)
- `src/ui/public/templates/dashboard-layout.html`, `src/ui/layouts/dashboard-layout.js`, `src/ui/languages/*/strings.xml` (Meetings navbar label and discoverability)

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/6fb2d2deff0b75ea44536e458f4ef4a0bf56d708
