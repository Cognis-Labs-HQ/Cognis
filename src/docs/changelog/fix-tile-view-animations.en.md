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
