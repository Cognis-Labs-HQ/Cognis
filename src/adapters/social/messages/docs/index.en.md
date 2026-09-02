# Messages browser client

The Messages browser client lets modules list room messages, open private rooms, and send messages through the Social Messages adapter's authenticated API contract.

## Usage examples

Import `uiCtx`, require `social:messagesUiClient`, and call `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, or `sendRoomMessage(roomId, payload)` from browser code.

## Technical specification

The client returns the original `Response` for caller-owned status and payload handling. It URI-encodes room IDs, keeps route knowledge inside the owning adapter, forwards optional access tokens and access-denied suppression, sends JSON for writes, and is available only while the Social gateway and Messages adapter are enabled.

The public `social:messages:deleteChatroom` capability accepts a room ID and actor account ID. It permanently removes the room and its dependent records when the actor created the room or is its only remaining participant.

## Browser VoIP provider contract

Messages displays a video-call action for direct and group chats when a browser provider contributes the `voip:startCall` capability to `uiCtx.capabilities`. The provider receives the room identity, every chat member's account identity and display metadata, the `messages` source identifier, and a `pip` presentation request. It owns meeting creation, participant invitation, and mounting its call surface as a picture-in-picture window on the current page.

