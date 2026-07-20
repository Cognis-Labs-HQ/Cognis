# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Media-heavy elements such as images, video, audio, canvas content, and explicitly opted-in embeds are parked and reattached across composer re-renders instead of being recreated, while API-managed meeting iframes opt out so their password and recovery wrapper keeps control.
