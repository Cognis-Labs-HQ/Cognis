# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Media-heavy elements such as images, embeds, canvas content, and meeting iframes are now parked and reattached across composer re-renders instead of being recreated, preventing disruptive reloads during edit toggles, moves, popups, and notifications.
