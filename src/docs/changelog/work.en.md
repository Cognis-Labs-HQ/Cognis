# Whiteboard Presence and Share Defaults

## Presence Clears Promptly

Whiteboard presence now drops inactive sessions immediately and hides stale visitors that have not checked in for more than five minutes.

## Whiteboard Sync Starts Cleanly

The whiteboard sync indicator now moves out of the syncing state as soon as the socket joins the room, without waiting for the first canvas edit.

## Shared Pages Default to Guest-Safe Chrome

The Share gateway now supplies guest-safe page defaults that hide navigation and share controls unless a shared page explicitly opts into them.

## Whiteboard Sharing Defers to Share Gateway

The whiteboard toolbar now asks the Share gateway to render share controls, so guest sessions do not see a share button and share behavior stays gateway-owned.
