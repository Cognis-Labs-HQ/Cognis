# Stable page composer edit layout

**Feature Branch:** feature-fix-element-placement-in-edit-mode

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Media-heavy elements such as iframes, images, video, audio, canvas content, object/embed content, and explicitly preserved elements are kept in their existing cards while edit controls are layered around them, avoiding iframe reparenting that can refresh embedded windows such as active meetings. Components can still opt out with `data-composer-preserve="false"` when their API wrapper must own recovery.

## Meeting refresh safeguards

Active meetings continue to use the browser unload confirmation for real refresh/navigation attempts, but Cognis no longer changes the shared loading state during `beforeunload`. The loading overlay now waits for `pagehide`, so cancelling the browser refresh prompt leaves the current meeting page and embedded session visible and interactive.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa6742a49a2e6f0284b44c84dec7ca4d7b503ac0
