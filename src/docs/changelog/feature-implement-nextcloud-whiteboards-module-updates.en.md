# Nextcloud Whiteboard reliability updates

**Feature Branch:** feature-implement-nextcloud-whiteboards-module-updates

## Whiteboard startup is gated by websocket preflight

Whiteboards now wait for HTTP liveness and websocket authentication checks before creating or opening editable canvases.

## Canvas usability improvements

The toolbar now includes a tool lock, select cursor behavior is clearer, presence avatars prefer profile pictures, and the whiteboard list shows last-updated timestamps.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/77888f1c590d852d356fac8a601cd11f6a203ee7
