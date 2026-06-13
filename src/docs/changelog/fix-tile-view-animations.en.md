# Classroom Workspace Fixes

## Restore classroom SPA styles

The classroom SPA route now loads the workspace stylesheet during in-app navigation, so the blackboard workspace, sidebar spacing, chat tile, and agenda controls render correctly without requiring a hard reload.

## Stabilize workspace switching

Tile and slideshow navigation now keep the active workspace in the correct visual order, keep the layout toggle visible while chat is open, initialize chat and whiteboard views consistently, and return students to the classroom with a toast when the teacher leaves.

## Improve teacher materials uploads

Teacher library uploads now use the `teacher-materials/` storage path, use the shared upload SVG in the picker, avoid reopening the popup twice, and use the larger documents upload limit intended for classroom materials.

## Move Notepad Ownership Into the Notepad Adapter

Classroom agenda and notepad file APIs now live in the study/notepad adapter, while the classes adapter only exposes shared classroom resource capabilities. The notepad adapter now owns agenda snapshots, note-file routes, and a configurable max file-size setting through the study adapter config surface.

## Add Nextcloud Whiteboard Admin Configuration

The Nextcloud Whiteboard module now provides an Administration settings popup and persisted module configuration routes at `/api/v1/modules/nextcloud-whiteboard/config`. URL, signing secret, and token-expiry settings are stored in the database and used by runtime embed-token generation.

## Consolidate Open Chat button and rename to Chat

The duplicate "Open Chat" button was removed from the blackboard actions toolbar. The remaining workspace tab button is now labelled "Chat" for brevity.

## Active tile is swapped below all others on selection

Only the active tile carries a content view. Clicking an inactive tile swaps it with the current active tile so the active tile always renders last in the stack.

## Teacher view state sync is decoupled from snapshot polling

Students independently query a dedicated API endpoint for the teacher's current board focus and tile layout on every data refresh and SSE event, enabling sync to work in both slideshow and tiled views.

## Chat window styling owned by the messages adapter

All classroom chat panel CSS rules moved to the messages adapter so the chat panel renders consistently with the Messages page.

## Teacher materials keep real filenames

Teacher material library uploads now persist the original filename and content type as library metadata, so the picker and linked class materials show meaningful names instead of raw UUID keys.

## Class materials open in the classroom

Opening a class material now switches the classroom workspace to an inline viewer instead of trying to render the file inside the sidebar, preventing unauthorized inline file loads and keeping the active material in the main teaching surface.

## Meetings tolerate longer idle gaps

Jitsi classroom meetings now keep presence entries active for a much longer window before the backend considers them gone, reducing false meeting shutdowns caused by delayed browser heartbeats.

## Slideshow navigation arrows use shared boilerplate

Navigation arrows are generated from a single helper shared by the initial render and the dynamic tile refresher. Arrows are suppressed automatically on the Chat view.

## Fix teacher materials popup displaying metadata file and unresolved filenames

The metadata index file (`.library-metadata.json`) was incorrectly included in the teacher materials listing, and uploaded material filenames appeared as raw UUID keys. Both issues were caused by a double-slash path bug in the local file gateway. The gateway now normalises trailing slashes before constructing relative file keys.

## Fix notepad file picker interactions

The notepad file picker callback was registered under the unsupported `onMount` key instead of `onOpen`, preventing the Open, Rename, and Delete buttons from ever working. The save popup also carried a redundant green Open button alongside Save. Both issues are fixed; the Rename button is now styled as a neutral action rather than red.

## Enforce class membership for student file access

Teacher material files are now served through a class-scoped route that verifies the requesting user is enrolled in the class before delivering any content. Students and teachers use `/api/v1/study/classes/:id/materials/files/:key` instead of the generic file API, and the key is validated against the class resource list to prevent traversal.
