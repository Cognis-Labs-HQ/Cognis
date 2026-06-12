# Classroom Screen Overhaul

## Blackboard redesign

The classroom blackboard now uses a dark charcoal texture instead of a flat green background, with softened rounded borders that blend naturally into the page.

## Removed duplicate member list

The sidebar member roster is no longer duplicated in the main blackboard view. The blackboard now shows compact Present and Absent username lists only.

## Meeting window: removed close button

The close button has been removed from the Jitsi meeting window. When a student leaves a meeting, they are automatically returned to the page they navigated from.

## Jitsi auth-blocked overlay

When a meeting requires authentication that students cannot complete, the meeting widget stops reconnecting and shows a "Classroom is currently closed" overlay. Polling resumes automatically once the teacher enters the meeting.

## Chat as default workspace

Students now see the chat window by default. The meeting or whiteboard view opens automatically when the teacher activates one, then reverts to chat when it is closed.

## Teacher-state polling

Students poll the teacher's active board focus and follow it automatically instead of receiving pushed state.

## Notepad redesign

The notepad editor now occupies the full viewport with a format toolbar including paragraph style, font size, and text color controls. Files can be saved to class materials, opened from class materials, or downloaded directly.

## Materials file upload

Teachers can now upload files to class materials via the file gateway. Uploaded files are listed and can be removed individually.

## Removed student chat/meeting toggle controls

Students no longer have manual buttons to show or hide the chat or meeting windows. Workspace visibility is driven entirely by teacher state.

## Student refresh loop and meeting guard fixed

Students no longer get stuck re-entering a meeting after leaving it. Auto-join is guarded by a per-session join record; it only fires once per unique meeting ID and only when a teacher has started a meeting.

## Search button fixed for students and teachers

Pressing Search as a student now navigates to the class finder page. Teachers in teacher view no longer see the button. The broken state where a teacher's class list disappeared on pressing Search has been eliminated.

## Teacher/student view toggle fixed

Switching between teacher and student view no longer requires two presses or causes the class list to disappear. The toggle updates the URL in place and refreshes the content without a full remount.

## Agenda and Create Agenda unified into real-time inline editing

Teachers can now add agenda items directly in the agenda panel without opening a popup. New items appear for students immediately on their next refresh. Each item has an inline delete button for teachers.

## Whiteboard auto-creates on first press

Pressing the Whiteboard button as a teacher now automatically creates and opens a whiteboard. The two-step "press Whiteboard → press New Whiteboard" flow has been removed.

## Classroom layout: 15% roster panel + 85% workspace

The live rail sidebar has been replaced with a CSS grid layout: a 15% chalk-font present/absent roster panel on the left and the main workspace on the right. The toolbar is visible to all users but non-interactive for students.

## Blackboard style applied to page-content div

The blackboard background is now applied directly to the page-content container at mount time, giving a full-bleed blackboard experience without affecting other pages.

## File save/open/delete/rename for classroom notepad

Pressing Save or Open in the notepad workspace opens a file management interface backed by the file gateway. Files are stored per class and can be renamed or deleted from the open dialog.

## Student meeting loop eliminated

Students were entering a continuous leave/rejoin cycle after the classroom
realtime refresh detected an active meeting. The per-meeting join guard is now
recorded before awaiting the auto-join call, so a rapid `videoConferenceLeft`
event fired by Jitsi between unhiding the embed and the subsequent
`isMeetingOpen()` check no longer leaves the guard unset and restarts the cycle.
Transient null values from the active-meeting API no longer reset the guard,
preventing a secondary loop caused by brief API flicker.

## CSS architecture compliance restored

`classes.css` exceeded the 1000-line guardrail. The file is now an
`@import` aggregator and its styles are split across four focused sibling files
under `src/adapters/study/classes/ui/classes/`: `list.css`, `room.css`,
`blackboard.css`, and `editor.css`.

## Classroom notepad unit test fixed

The `classroom-notepad.test.js` test was failing because Node could not resolve
browser-rooted `/static/` import paths. A custom ESM loader hook
(`src/tooling/test-helpers/browser-paths-hook.mjs`) now maps those paths to their
real filesystem locations, making the test pass without changing production code.

## Classroom render export error fixed

`classroom-render.js` was exporting a name (`renderStudentRoster`) that was never defined in the module, causing an uncaught `SyntaxError` that crashed the classroom page. The undefined export has been removed.

## Crash popup z-index raised above loading overlay

The runtime error crash popup was rendered beneath the page loading overlay (z-index 9999), making it invisible while a page was still loading. A new `popup-overlay--critical` modifier class elevates the crash popup to z-index 10000, ensuring it is always visible when an error occurs.

## Classroom student meeting no longer re-enters after leaving

The classroom adapter's student auto-join logic was re-launching the Jitsi embed on every 3-second refresh cycle after the student left a meeting. Two concurrent-call and re-entry issues were fixed: (1) the `openMeetingEmbed` setup phase now holds an `openInProgress` flag so that a new `tryAutoJoin` call during Jitsi initialisation cannot create a second overlapping embed, and (2) a `triedMeetingId` guard inside `classroom-meeting-embed.js` prevents re-joining the same meeting ID that was already attempted. A new `notifyActiveMeeting(meetingId)` method allows the classroom adapter to signal a genuinely new meeting, which resets the guard and clears the auth-block state. The classroom's refresh loop has been simplified to call `tryAutoJoin` unconditionally; all join-guard logic now lives inside the jitsi-meet module.

## Classroom Jitsi exits stay in Cognis

Leaving an embedded classroom Jitsi meeting now closes the classroom meeting
window immediately instead of letting the iframe fall through to the Jitsi home
page. Classroom meeting exits also return the workspace to the agenda view.

## Same-meeting rejoin is suppressed after leaving

When a student intentionally leaves an active classroom meeting, Cognis now
remembers that dismissal for the current meeting ID. The classroom refresh loop
will not auto-join that same meeting again until a newer meeting becomes
active.

## Classroom uses the Meetings overlay pattern

The classroom meeting window now shows the same overlay-style join and closed
state feedback pattern used on the Meetings page, so loading and closure states
stay inside the Cognis UI.

## Agenda route separated from file routes

The classroom agenda-item deletion handler has been moved to its own route
module, keeping file-access and calendar-access responsibilities separate.

## normalizeBoardFocus extracted to a dedicated module

The shared board-focus normalizer is now in its own file in each layer
(`store/board-focus.ts` on the server, `ui/board-focus.js` in the browser)
instead of being defined inline inside the larger classroom files.

## Meetings Jitsi exits stay in Cognis

Leaving an embedded Jitsi meeting from the Meetings page now closes the
meeting window immediately inside Cognis. The Meetings embed intercepts the
Jitsi hangup toolbar action before the iframe can fall through to the hosted
Jitsi homepage, while preserving the existing leave-state overlay flow.

## Meeting overlay no longer causes page flapping for students

During the realtime refresh cycle, a full DOM replacement is now skipped when
a meeting is already open. Dynamic parts (desk floor, roster) update in place
without disrupting the meeting overlay.

## Students are pushed back to the classroom when the teacher ends a meeting

When the teacher leaves an active meeting, students are now automatically
removed from the meeting view and shown a toast notification. The overlay
closes cleanly and the page returns to the default workspace.

## Switching classes now closes an open meeting from the previous class

Selecting a different class from the footer no longer leaves a stale meeting
overlay from the previous class visible. The meeting closes before the new
class loads.

## CSP connect-src now includes the configured Jitsi instance

The Content Security Policy `connect-src` directive now includes the
registered Jitsi server origin alongside `script-src`, resolving console
violations when the Jitsi external API makes connections back to the meeting
server.

## Jitsi cookie regression fixed

Added `allow-same-origin` to the Jitsi iframe sandbox so the Jitsi domain can read and write its own session cookies.

## Meeting guard prevents Jitsi homepage bleed-through

When authentication is blocked or the user cancels the meeting auth flow, the meeting window is now properly closed instead of showing the Jitsi homepage through an overlay.

## Teacher view always resets on navigation

Teachers who had previously switched to student view are now always returned to teacher view on page refresh or SPA navigation.

## Sub-navigation visible for teachers in student view

Fixed a regression where teachers in student view would see an empty class list in the sub-navigation bar.

## Classroom layout restructured

The Present (roster) tab has been moved from the sidebar to the workspace tab row. The Class Agenda entry has been removed from the sidebar since it already exists in workspace tabs. The meeting button has been removed from the blackboard action toolbar. The sidebar now shows only class materials.

## Blackboard starts collapsed on entry

When entering a class, the blackboard is minimised to the header row. It expands when a workspace tab is pressed.

## Workspace tab active state

Each workspace tab button receives an `active` CSS class when its mode is selected.

## Dynamic refresh limited to surgical updates

The realtime refresh cycle for students no longer triggers full DOM replacements; desk-floor and roster-panel are updated in place instead.

## Teacher desk click disabled

Clicking on the teacher's desk no longer opens the user search popup.

## Chalk font scoped to workspace and roster panels

The chalk font is now applied explicitly to `classes-workspace-main` and `classes-roster-panel` and propagates to form elements via `font-family: inherit`.

## Blackboard height fits content

The blackboard no longer has a forced minimum height when no meeting is active, so it sizes naturally to its children.

## "Present" tab renamed to "Students"

The classroom roster tab has been renamed from "Present" to "Students".

## Students and Agenda moved to the sidebar

Pressing the Students or Agenda button now opens the corresponding panel inside the sidebar instead of replacing the main workspace. Each sidebar tab (Materials, Students, Agenda) maintains its own independent active state.

## Workspace tabs control only the main view

The workspace tab row now contains only Notepad, Whiteboard, and Meeting. Active state for workspace tabs is tracked separately from the sidebar tabs.

## Meeting conference-web errors handled

The classroom meeting embed now catches `[ERROR] [app:conference-web]` errors from the Jitsi API. The meeting closes gracefully and the user sees an error toast.

## Tiled material viewer

Class materials are now displayed as a visual tile grid in the classroom sidebar Materials panel. Each file is shown as a card with a file-type icon and its filename.

## Inline document viewer

Double-clicking a material tile opens an inline viewer directly in the sidebar. Images are displayed natively, PDFs are embedded, and other file types show a download link.

## Teacher broadcast of active material

When a teacher opens a material tile, the selection is broadcast to all students via the existing realtime snapshot mechanism. Students automatically switch to the Materials panel and see the same file.

## Back to Materials navigation

A "Back to Materials" button in the viewer header closes the viewer and returns to the tile grid. For teachers, closing the viewer also clears the broadcast.

## Tile container now matches single-view dimensions

The stacked tile deck container height has been aligned with the single-panel view, so the blackboard area no longer expands unnecessarily when the tiled layout is active.

## Whiteboard and meeting tiles are created lazily

Whiteboard and meeting tiles in the classroom blackboard are no longer pre-rendered on page load. Each tile is only added to the DOM the first time the user (or the system, for student auto-join) activates that mode. Once initialized, tiles remain in the deck and retain their state while switching between them.

## Sidebar always visible with Students roster and Materials

The classroom sidebar now permanently shows the Students roster above the Materials list. The three-tab toggle (Materials / Students / Agenda) has been removed — there is no longer a need to switch tabs to see the class roster.

## Agenda moved to workspace tiles only

Agenda is no longer a sidebar tab. It lives exclusively as the default workspace tile in the main blackboard area, consistent with how Whiteboard and Meeting tiles work.

## Students see read-only Agenda without teacher controls

Students see the Agenda textarea in read-only mode. The snapshot save and open controls are hidden from students entirely. Only teacher accounts see the snapshot management toolbar.

## All workspace tab buttons always visible for students

Students now always see all three workspace tab buttons (Classroom, Whiteboard, Meeting). Buttons that are not available in the current state are rendered disabled rather than hidden.

## Meeting tile persists when a meeting is running

The Meeting workspace tile is now rendered whenever a meeting is open, regardless of which tiles were previously initialized.

## Tile stacking layout — inactive headers always clickable

Workspace tiles stack vertically in a flex column. Inactive tiles collapse to their header bar, which remains fully clickable to switch between tiles without needing the tab row.

## Flowing shimmer animation on active tile header and tab button

The active workspace tab button and the active tile header now display a flowing shimmer animation to make the current selection immediately obvious.

## Meeting-running animation on meeting button and tile header

While a meeting is running, the Meeting tab button and Meeting tile header show a distinct amber/red flowing animation so participants know a meeting is live even when viewing a different tile.

## Critical fix: meeting exit catcher no longer allows Jitsi homepage redirect

The click-navigation interceptor in the meeting embed now blocks all navigation away from the classroom page while a meeting is open, including external URLs. The previous guard had an inverted origin check that incorrectly allowed external links through. The Jitsi iframe src is also blanked before disposal to prevent the Jitsi homepage from executing in the iframe and opening popup windows.
