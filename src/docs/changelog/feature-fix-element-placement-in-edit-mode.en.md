# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Media-heavy elements such as iframes, images, video, audio, canvas content, object/embed content, and explicitly preserved elements are kept in their existing cards while edit controls are layered around them, avoiding iframe reparenting that can refresh embedded windows such as active meetings. Components can still opt out with `data-composer-preserve="false"` when their API wrapper must own recovery.

## Meeting refresh safeguards

Active meetings now intercept keyboard refresh shortcuts before the browser unload flow starts, showing an in-app choice to stay in the meeting or intentionally refresh and leave. The shared page loading overlay now waits for `pagehide` instead of `beforeunload`, so cancelling the browser refresh prompt does not leave the meeting page in a loading state.
