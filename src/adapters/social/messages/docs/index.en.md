# Messages browser client

The Messages browser client lets modules list room messages, open private rooms, and send messages through the Social Messages adapter's authenticated API contract.

## Usage examples

Import `uiCtx`, require `social:messagesUiClient`, and call `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, or `sendRoomMessage(roomId, payload)` from browser code.

## Technical specification

The client returns the original `Response` for caller-owned status and payload handling. It URI-encodes room IDs, keeps route knowledge inside the owning adapter, forwards optional access tokens and access-denied suppression, sends JSON for writes, and is available only while the Social gateway and Messages adapter are enabled.

The public `social:messages:deleteChatroom` capability accepts a room ID and actor account ID. It permanently removes the room and its dependent records when the actor created the room or is its only remaining participant.

## Browser VoIP provider contract

Messages asks the browser provider's `voip:startCall` capability to resolve each direct or group chat independently. The provider receives the room identity, every member's account identity and display metadata, the `messages` source identifier, and the supported `component` and `navigate` actions. Returning `null` hides the camera for that room. A `component` result supplies a component UUID, route ID, meeting context, and optional mode so Cognis owns the temporary stage, mounts the component window, and removes the stage on close or failure. A `navigate` result supplies a same-origin URL, such as `/meetings/<meetingId>?start=1`, for the app router. Providers therefore decide whether a room may create a disposable call, should open an existing meeting, or should redirect without directly changing the Messages layout.
