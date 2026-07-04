# Classroom UI Stability

## Smooth tile and tab animations during realtime refresh

The dynamic realtime refresh no longer resets active tile or tab header animations. Workspace tiles are only reordered in the DOM when their position actually changes, so ongoing CSS animations on active tiles are never interrupted by a background poll cycle.

## Chat composer focus preserved during refresh

Typing in the classroom message composer no longer loses focus when the classroom refreshes in the background. The browser's active element is saved before any DOM replacement and restored afterwards, keeping the cursor position and input state intact.

## Whiteboard tab hidden when module is not configured

The Whiteboard tab in the classroom blackboard is now controlled by whether the Nextcloud Whiteboard module is actually configured on the server. The snapshot endpoint exposes a `whiteboardEnabled` flag and the UI uses it to omit the tab entirely when the module is absent, rather than rendering it in a permanently disabled state.

## Class materials now open in an embedded viewer

PDF and image class materials now display in an embedded viewer as expected. Two underlying issues were resolved: a race condition where the realtime poll could overwrite a freshly selected material key before it was persisted to the server, and a missing full DOM refresh that prevented the material viewer tile from updating when a teacher broadcasts a new material to students.
