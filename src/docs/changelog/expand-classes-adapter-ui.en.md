# PR Changelog — Classrooms

## Summary

Migrated the classroom experience onto `/classroom` and redirected the legacy
`/classes` and `/my-classes` pages there.

Moved class selection into the shared study footer, removed the classroom
language-module sub-navigation entry, and updated the unified classroom page to
support teacher and student view switching, in-room chat/meeting actions,
available-class browsing, and popup-driven class creation.

Extended the classes adapter for join modes, duplicate-language protection,
agenda scheduling, classroom chat resolution, and guaranteed classroom records,
then updated translations and regression tests for the new flow.

The class selector dropdown has been moved out of the page body and into the
global footer as a page-composer footer element, rendering inline as
"Class: [dropdown]" with instant apply. The "Teacher:" prefix has been removed
from the available-classes list and from the language-module classroom teacher
display.

The classroom view has been completely redesigned as a 2D top-down composite.
The room is bordered to represent walls. On the front wall a dark-green blackboard
shows the active class agenda written in a cursive chalk-style font with action
buttons (chat, meeting, create agenda). A scrollable student roster panel sits to
the left of the blackboard. A wooden door with a visible swing arc is positioned
on the right side wall; for students it is the leave-class control, for teachers
it doubles as a drag target to remove students.

The floor fills with dynamic rows of paired desk-and-chair units that scale with
the student capacity. Desks are styled as top-down wooden rectangles and chairs as
smaller rounded elements below each desk; no button borders or table cell visuals
are used. Occupied desks show a two-letter student badge. Clicking a desk opens
the per-student management panel below the room.

The materials and homework editor (teacher view) has been moved below the room as
a collapsible section. The page-composer now supports a `footer` parameter for
injecting elements into the global footer bar.

## Classroom Toolbar Follow-Ups

The classroom roster now labels the section as "Students" and shows the teacher
at the top of the list so the classroom panel matches the requested terminology.

The classroom toolbar now uses text labels instead of emoji-only controls,
hides its action strip when a real student is viewing the room, and wires the
chat/meeting toolbar buttons into the existing classroom windows so they open
reliably.

## Classroom UI Improvements

Clicking a student's avatar or name button in the classroom roster now navigates
directly to their `/profile/` page, consistent with the avatar interaction model
used elsewhere in the app.

The teacher row in the classroom roster is now rendered above the "Students"
heading rather than inside the student grid.

The classroom meeting window is now contained within the blackboard element
instead of covering the full page. The meeting overlay and chat panel are
positioned absolutely inside the blackboard's stacking context so they never
escape its bounds.

The meeting flow in the classroom now mirrors the full API flow used by the
Meetings page: a create call is followed by a join call with a persistent session
ID, and the Jitsi embed is initialised with the current user's display name,
email, and avatar as well as the standard toolbar button set.

Fixed a bug where a teacher could not see their classes and appeared stuck in
student view. The root causes were a stale role in localStorage not being
refreshed on mount, and a `classroomBound` flag on the persistent `#app` element
that prevented interaction handlers from re-binding after SPA navigation. The
role is now refreshed from the API on mount when needed, and the bound flag is
now tracked with a mount-scoped local variable.

## Classroom meetings now open correctly for students

Students clicking a meeting button placed on the classroom board now join the
active meeting rather than attempting to create one (which is a teacher-only
action and always failed for students). Students without an active meeting to
join see no change in behaviour.

## DOM refresh no longer resets the Jitsi meeting iframe

Presence update events previously triggered a full classroom content replacement,
briefly detaching the meeting iframe from the document — a browser-defined
condition that causes iframes to reload. The frame was destroyed every time any
participant's status changed. Presence changes now use the targeted
`refreshDynamicDom` path, which only replaces the desk-floor and member-roster
nodes without touching the meeting overlay.

## Full DOM refreshes preserve active meetings and chat windows

For DOM refreshes that replace the entire classroom content element (class
settings, seat management, etc.), the meeting and chat overlay elements are now
moved to a live ancestor before the content is swapped and moved back into the
blackboard afterwards. This keeps both elements — and any iframes inside them —
connected to the document throughout the operation.

The meeting lifecycle inside the classroom now exactly matches what the
Meetings page does. The new `createClassroomMeetingEmbed` factory in the
`jitsi-meet` module owns:

- `videoConferenceJoined` — captures the local participant ID, resolves
  moderator status, and applies display name, email, and avatar via Jitsi
  commands.
- `participantRoleChanged` — keeps moderator state updated so privileged
  settings (`subject`, `password`) are re-applied when the role changes.
- `passwordRequired` — submits the stored meeting password.
- `notificationTriggered` / `errorOccurred` — detects server-side termination
  notices and closes the window with a `terminated` presence flag so the
  server records the meeting as ended by the host rather than abandoned.
- `videoConferenceLeft` / `readyToClose` — clean up on participant-initiated
  exit.
- Heartbeat timer — sends `presence active=true` every 10 s to keep the
  session alive.
- State-refresh timer — polls the meeting state every 5 s and closes the
  window as soon as the server reports `endedAt`, so students see the window
  disappear the moment the teacher ends the meeting.

The `classroom-windows.js` adapter now delegates entirely to
`createClassroomMeetingEmbed` and contains no meeting logic of its own,
eliminating the duplication that previously caused the two surfaces to drift.

## Classroom Notepad and Whiteboard

Added a per-class **Notepad** — a lightweight in-session scratch pad accessible
to all class members via the toolbar. Notes are stored in `sessionStorage` keyed
by class ID (auto-cleared when the browser tab is closed) and never reach the
server. A "Download as Markdown" button exports the current text as a `.md` file.
The notepad panel is a persistent floating element anchored to the blackboard
corner, toggled by a toolbar button.

Added a **Whiteboard** capability backed by the Nextcloud Whiteboard server
(`NEXTCLOUD_WHITEBOARD_URL` / `NEXTCLOUD_WHITEBOARD_SECRET`). Teachers can
create and delete named whiteboards per class; all class members can open a
whiteboard in a full-screen overlay. The server mints a short-lived HS256 JWT
and returns an `embedUrl`; the Nextcloud Whiteboard frontend loads inside a
sandboxed iframe with no external CDN dependency. Board state is stored in
real-time by the NC WB server via WebSockets. A `classroom_whiteboards` database
table tracks board metadata and optional file keys for persisted snapshots.

- `src/adapters/study/classes/store/types.ts`
- `src/adapters/study/classes/store/schema.ts`
- `src/adapters/study/classes/store/whiteboards.ts`
- `src/adapters/study/classes/store/db-classes-store.ts`
- `src/adapters/study/classes/routes/classroom-whiteboards.ts`
- `src/adapters/study/classes/routes/route-helpers.ts`
- `src/adapters/study/classes/routes/index.ts`
- `src/adapters/study/classes/index.ts`
- `src/adapters/study/classes/ui/classroom-notepad.js`
- `src/adapters/study/classes/ui/classroom-whiteboard-window.js`
- `src/adapters/study/classes/ui/classroom-windows.js`
- `src/adapters/study/classes/ui/classroom-render.js`
- `src/adapters/study/classes/ui/classroom.js`
- `src/adapters/study/classes/ui/classes-notepad.css`
- `src/adapters/study/classes/ui/classes-whiteboard.css`
- `docker/Dockerfile`
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`

- Classroom UI and shared study navigation:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/classroom-page.css`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
    - `src/ui/reuse/page-composer/init.js`
- Supporting integrations, strings, and tests:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`

    ## Workspace and schema follow-ups

    The classes schema bootstrap no longer probes Postgres with SQLite `PRAGMA`
    statements during dialect detection, so meeting startup stops generating
    intentional SQL errors in Postgres logs.

    The classroom blackboard now uses a shared workspace model with Agenda,
    Students, Notepad, Whiteboards, and Meeting modes. Notepad now lives in the
    main workspace instead of as a floating overlay, and the whiteboard toolbar
    button now opens the whiteboard workspace directly while still offering an
    explicit pop-out action.

## Student controls now follow active teacher sessions

Student meeting and whiteboard controls are now hidden until the teacher
actually has an active classroom meeting or an active whiteboard open.

The classes adapter now persists the active classroom whiteboard in classroom
state, limits student whiteboard API access to that active board, and removes
stale whiteboard controls as soon as the teacher closes the board. The
classroom meeting availability check now also fails soft and returns an empty
active-meetings list instead of repeated 400 responses when the viewer cannot
resolve a meeting handle.

The floating classroom chat window now renders above the dashboard header with
more top clearance so it no longer opens clipped underneath the sticky heading.

## Active meeting lookup fixed and classroom navigation guard added

Fixed a runtime error (`store.getClass is not a function`) that caused the
`/api/v1/modules/jitsi-meet/meetings/active` endpoint to fail whenever the
classroom participant-handle resolver ran. The capability used a non-existent
`store.getClass` call; corrected to `store.getClassById`, and the companion
`store.listClassMembers` call corrected to `store.getClassMembers` with the
teacher account ID supplied from the fetched class row.

The classroom meeting embed now registers the same navigation-guard listeners
used by the standalone Meetings page: `beforeunload` blocks a full-page reload,
a capture-phase `click` guard intercepts SPA link navigation, and a `popstate`
guard blocks the browser back/forward action — all showing the existing
"Leave the meeting before navigating away" toast when a meeting is active.
