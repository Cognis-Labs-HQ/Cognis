# Messages browser client

The Messages browser client lets modules list room messages, open private rooms, and send messages through the Social Messages adapter's authenticated API contract.

## Usage examples

Import `uiCtx`, require `social:messagesUiClient`, and call `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, or `sendRoomMessage(roomId, payload)` from browser code.

## Technical specification

The client returns the original `Response` for caller-owned status and payload handling. It URI-encodes room IDs, keeps route knowledge inside the owning adapter, forwards optional access tokens and access-denied suppression, sends JSON for writes, and is available only while the Social gateway and Messages adapter are enabled.

The public `social:messages:deleteChatroom` capability accepts a room ID and actor account ID. It permanently removes the room and its dependent records when the actor created the room or is its only remaining participant.

The adapter also publishes `social:messages:resolveRoomMembership`. Given a room ID and requester account ID, it authorizes only an active room member and returns the active member account IDs. Providers use this boundary instead of reading Messages persistence directly.

The New Room picker uses the shared search popup’s `category: "user"` and `typeFilter: "user"` parameters, matching other user-only consumers such as Jitsi Meet, so only user results are offered for conversation creation.

An incoming call is presented as a contributed action bar immediately before the thread header, with its label on the left and provider-owned Answer and Decline SVG actions on the right. Historical call events remain plain timeline records rather than interactive prompts.
