# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Media-heavy elements such as iframes, images, video, audio, canvas content, object/embed content, and explicitly preserved elements are parked and reattached across composer re-renders instead of being recreated, preserving embedded windows such as active meetings. Components can still opt out with `data-composer-preserve="false"` when their API wrapper must own recovery.
