# Usage

Practical procedures for Messages.

## Prerequisites

Sign in; encrypted rooms also require access to your account keyring.

## Examples

Create a room, choose recipients, write a draft, inspect Preview and send. Save repeated wording as a template when useful.

Import `uiCtx`, require `social:messagesUiClient`, and call `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, or `sendRoomMessage(roomId, payload)` from browser code.

## Expected Results

Acknowledged messages appear in the room history. Drafts survive resizing; encrypted drafts clear after acknowledgement or durable queuing.

## Troubleshooting

Check membership and keyring access. Offline opening requires prepared assets and a cached room; uncached histories need a connection.
