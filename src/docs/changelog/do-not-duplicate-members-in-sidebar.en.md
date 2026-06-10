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
