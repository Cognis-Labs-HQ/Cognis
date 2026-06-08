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

## Changed components and files

- Study classes adapter routes and stores:
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
