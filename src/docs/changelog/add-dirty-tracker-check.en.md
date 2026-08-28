# Popup Dirty Checks

**Feature Branch:** copilot/add-dirty-tracker-check

## Close prompts only after edits

Protected form popups now consult the shared dirty tracker before opening the discard confirmation. Opening a form and closing it immediately no longer shows the warning when nothing changed.

## Silent tracking for popups

The shared unsaved-changes utility can now track popup form fields in a quiet mode that keeps the floating save/discard controls hidden. This lets popup close protection reuse the same dirty-state logic without adding extra UI.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/88648cc411c93eaad6bba45e142bede90dbe5b0c
