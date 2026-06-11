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
