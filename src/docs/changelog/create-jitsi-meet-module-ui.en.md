# Jitsi Meet Module Foundation

## Summary

Added a new Jitsi Meet module with configurable instance settings, meeting persistence, participant-gated access checks, meeting session state APIs, a dedicated meetings page, and administration monitoring.

Subsequent improvements:

- Meetings page layout is now entirely composer-driven: participants panel is full-width on top; Meeting Window and Chat each occupy exactly half the available grid width using `gridSize.max: 'half'`.
- Meeting Overlay renamed to Meeting Window throughout.
- Available Participants table pre-populated with all visible users on page load.
- Participant search replaced with a popup (matching Messages "New Conversation" UX).
- New `GET /api/v1/modules/jitsi-meet/participants?q=` endpoint serves visible profiles (all when `q` is empty; filtered otherwise).
- Participant tables replaced with a free-for-all avatar pool: each avatar is draggable (with hover profile preview), can be dragged onto the Meeting Window to stage them above the "Meeting Window" text (green drop zone highlight), and dragged back to de-stage.
- Find Participants popup now supports multi-select with an "Add Selected" floating confirm button; all selected users are added to the Available pool on confirmation.
- Page composer customization and layout persistence enabled.
- Pre-meeting chat message changed to "Waiting for meeting to start."
- Pre-flight check now shows a green tick when the Jitsi instance returns a healthy probe response.
- Fixed 400 error on meeting creation caused by case-sensitive handle lookup; `getProfileByHandle` now does a case-insensitive match.
- Administration → Components: Settings button moved from inside the chevron `<summary>` to the expanded module detail section, replacing the cog icon with a text "Settings" button.
- The meeting store schema is forward-only: `ensureTable` defines the authoritative column set and no backwards-compatibility migration code exists.
- Meeting creation now writes `room_slug` from the generated meeting URL slug, preventing failures on databases where legacy `room_slug` is still `NOT NULL`.
- Meeting-linked group chats now include the meeting date in their room title.
- Clicking the member count in a meeting group chat now opens a popup showing currently present users with linked avatars for profile previews.
- The Meeting Window now uses a much lighter overlay treatment in light mode so the pre-meeting stage is readable instead of heavily shaded.

## Changed Files / Components

- `src/modules/jitsi-meet/ui/app.js` (avatar pool, multi-select, green tick, drag-to-stage, composer options)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (avatar pool, staged participants, drop-zone highlight, tick indicator)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (new keys: probe_done, add_selected; updated chat.pending)
- `src/ui/reuse/search-bar.js` (multiSelect + onSelectMultiple support, confirm footer)
- `src/ui/styles/reuse/search-bar.css` (multi-select result styles, confirm footer)
- `src/ui/styles/page-builder.css` (settings button style, removed cog button styles)
- `src/ui/app/administration/index.js` (Settings button moved to expanded section)
- `src/adapters/social/profile/store.ts` (case-insensitive getProfileByHandle)
- `src/modules/jitsi-meet/api/store.js` (forward-only schema plus `room_slug` compatibility on meeting inserts)
- `src/modules/jitsi-meet/api/index.js` (dated meeting chat titles, meeting chat-room summary endpoint)
- `src/adapters/social/messages/ui/app.js` (clickable member count popup for present-user summaries)
- `src/adapters/social/messages/ui/messages.css` (member summary popup and clickable subtitle styles)
- `src/adapters/social/messages/ui/languages/*/strings.xml` (present-user summary strings)
- `src/modules/jitsi-meet/api/tests/store.test.js` (meeting insert assertions now verify `room_slug` is populated from the meeting URL slug)
- `src/ui/tests/regression-followups.test.js` (meeting chat title and member-summary regressions)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (lighter Meeting Window overlay, spinner, and staged-user contrast in light mode)

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
- https://github.com/le-firehawk/Cognis/commit/65261ce6
