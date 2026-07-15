# Whiteboard Presence and Share Defaults

## Presence Clears Promptly

Whiteboard presence now drops inactive sessions immediately and hides stale visitors that have not checked in for more than five minutes.

## Whiteboard Sync Starts Cleanly

The whiteboard sync indicator now moves out of the syncing state as soon as the socket joins the room, without waiting for the first canvas edit.

## Shared Pages Default to Guest-Safe Chrome

The Share gateway now supplies guest-safe page defaults that hide navigation and share controls unless a shared page explicitly opts into them.

## Whiteboard Sharing Defers to Share Gateway

The whiteboard toolbar now asks the Share gateway to render share controls, so guest sessions do not see a share button and share behavior stays gateway-owned.

## Keyboard Deletion for Selection

Selected whiteboard objects can now be removed directly with the Delete or Backspace key.

## Uploaded Images Render and Select

Pasted image uploads are now inserted through the normal creation flow, saved immediately, selected for resizing, and redrawn after the browser finishes loading the image.

## Clipboard Images and Select Default

Clipboard image paste now works from the page as well as the canvas, reads image clipboard items when files are not exposed directly, and refreshed whiteboards now default to the select tool.
