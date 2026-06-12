# Classroom Page Overhaul

## Tile heading animation 4x slower

The active tile heading shimmer animation now cycles at 6.4 s instead of 1.6 s, producing a calmer, more readable pulse effect on the classroom board.

## Slideshow nav buttons no longer animate on hover

The previous/next slide navigation arrows now suppress hover transitions and the shimmer animation, keeping focus on slide content rather than button chrome.

## Teacher view sync covers whiteboard and notepad

Switching to the Whiteboard or Notepad tab now propagates the board focus change to students in real time, fixing a bug where students saw no update when the teacher navigated between workspace tabs.

## Tile layout (Slideshow / Stacked) synced to students

The teacher's choice between Slideshow and Stacked tile view is persisted and broadcast to students on the next realtime poll, so every student always sees the same layout as the teacher.

## Students locked out of navigation while teacher is present

When the teacher is online in the selected class, students can no longer switch tiles, navigate slideshow slides, or use workspace tab buttons. Controls are visually dimmed with a not-allowed cursor and automatically re-enabled when the teacher goes offline or navigates away.

## Agenda edits pushed to students in real time

Typing in the agenda editor now debounces and PUTs the updated document to the server automatically, so students see the latest agenda without manual saves.

## Agenda toolbar and New button

A markdown formatting toolbar (Bold, Italic, Strikethrough, Code, Quote, Link, Heading) now sits above the agenda input. A New button creates a blank agenda document with a single click.

## Agenda snapshot dropdown sized to content

The saved-agenda select element now sizes itself to its content width instead of stretching to fill the row.

## Class Materials header consistent with Students header

The "Class Materials" label is now rendered as a plain section heading matching the "Students" heading style, placed inline with the Add button rather than inside a collapsible details element.

## Agenda textarea resize disabled

The agenda text area can no longer be manually resized, keeping the layout stable.

## Chalk font restored and slightly larger

The blackboard surface now explicitly re-applies the chalk font and uses a slightly larger base size to compensate for the font's reduced clarity at smaller sizes.

## Sidebar section borders removed

Visible separator borders between sidebar sections have been removed for a cleaner panel appearance.

## Meeting notification suppressed when already in classroom

Students who are already viewing a classroom no longer receive a meeting-started notification for that same classroom.

## Agenda updates now reach students in real time

When a teacher saves agenda changes, the student view is now re-rendered
immediately on the next refresh tick instead of waiting for a manual
page navigation.

## Students can freely switch workspace tabs

A bug caused the teacher's board-focus setting to override the student's
chosen workspace tab on every 3-second refresh tick, even when the teacher
had not set an explicit focus preference. The fix checks for an actual
non-empty value before overriding the student's tab selection.

## Students no longer auto-joined to meetings on page load

Auto-join now only fires when a new meeting is detected on a refresh tick,
not for a meeting that was already in progress when the student loaded the
page.

## Teacher navigation back to Classroom now works

Clicking the Classroom tab from any view correctly sets the workspace mode
and re-renders the panel for the teacher.

## Students are automatically led to the active Whiteboard

When a teacher activates a whiteboard, students now receive the embed token
as part of the initial data load and are navigated to the Whiteboard tile
without manual interaction.

## Agenda autosave no longer steals focus from the text box

The autosave timer now updates the in-memory document state directly instead
of reloading all class metadata and re-rendering the full DOM.

## Improved agenda toolbar with text style controls

The agenda toolbar now includes a text-style dropdown (Normal, Heading 1–3,
Quote, Code Block) matching the experience of standard Markdown editors.

## Materials upload uses a consistent platform upload button

The upload trigger in the Teacher Materials popup now uses a proper button
element instead of a label.

## Materials upload flow sends confirmation and failure toasts

Uploading a file now produces a success or failure toast, and the uploaded
file immediately appears in the library list with its title, type, size,
and upload date.

## Materials library list shows file metadata

Each library entry now displays a truncated file name, uppercase extension,
human-readable file size, and creation date.

## "Nothing found" state shown when no class materials exist

The materials sidebar now renders a shaded "Nothing found" message when
no symlinked class materials are present.

## Switching between tile and slideshow view preserves the active meeting

Toggling the tile layout no longer resets the meeting iframe.

## Teacher workspace mode is restored after a page refresh

When a teacher refreshes while students are in the class, their last
workspace mode is read from the persisted board-focus snapshot and restored
on mount.

## Per-user tile/slideshow preference is stored in user preferences

Each user's last-used tile layout is now saved through the DB-backed user
preferences API instead of localStorage, so the preference survives across
devices and browser sessions.

## Teacher materials upload picker works again

The Teacher Materials popup now binds its upload input when the popup opens,
restoring the system file picker and the upload-to-library flow.

## Classroom meetings keep their layout controls and keepalive refreshes

Meeting tiles now refresh slideshow controls without recreating the meeting
iframe, and the classroom embed sends extra presence refreshes on focus and
visibility changes to reduce inactivity-related disconnects.

## Students keep their own tile/slideshow preference

The teacher's broadcasted layout no longer overrides each student's
personal tile-layout preference.

## "Edit Agendas" popup for renaming and deleting saved agendas

A new "Edit Agendas" button opens a popup listing all saved agenda
snapshots with inline rename and delete actions.

## Snapshot rename and delete API routes added

`PATCH /agenda/snapshots/:snapshotId` and
`DELETE /agenda/snapshots/:snapshotId` are now available for teachers
to manage their saved agendas server-side.
