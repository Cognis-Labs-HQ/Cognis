# Jitsi Meet Module Foundation

## Summary

Added a new Jitsi Meet module with configurable instance settings, meeting persistence, participant-gated access checks, meeting session state APIs, a dedicated meetings page, and administration monitoring.

Subsequent improvements:
- Meetings page layout is now entirely composer-driven: participants panel is full-width on top; Meeting Window and Chat each occupy exactly half the available grid width using `gridSize.max: 'half'`.
- Meeting Overlay renamed to Meeting Window throughout.
- Available Participants table pre-populated with all visible users on page load.
- Participant search replaced with a popup (matching Messages "New Conversation" UX).
- New `GET /api/v1/modules/jitsi-meet/participants?q=` endpoint serves visible profiles (all when `q` is empty; filtered otherwise).

## Changed Files / Components

- `src/modules/jitsi-meet/*` (new module API, store, UI, i18n, docs)
- `src/modules/routes/module-extensions.ts` (module UI/capability registration enhancements)
- `src/api/server.ts` and `src/api/main.ts` (module capability provider wiring)
- `src/adapters/social/messages/*` (group chat URL resolution/reuse capability)
- `src/ui/app/administration/index.js` (module configure popup support)
- `src/ui/languages/*/strings.xml` (new reusable meeting keys)

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
