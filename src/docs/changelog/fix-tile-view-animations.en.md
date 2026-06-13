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
