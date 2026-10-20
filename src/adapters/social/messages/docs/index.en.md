# Messages browser client

New group rooms finish key generation and all member insertions before claiming an integration source. Any setup or binding failure deletes the partial room; cleanup failures are logged and propagated. Existing rooms and source exclusivity keep their current behavior.

The Messages browser client lets modules list room messages, open private rooms, and send messages through the Social Messages adapter's authenticated API contract.

## Usage examples

Import `uiCtx`, require `social:messagesUiClient`, and call `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, or `sendRoomMessage(roomId, payload)` from browser code.

## Technical specification

The client returns the original `Response` for caller-owned status and payload handling. It URI-encodes room IDs, keeps route knowledge inside the owning adapter, forwards optional access tokens and access-denied suppression, sends JSON for writes, and is available only while the Social gateway and Messages adapter are enabled.

The public `social:messages:deleteChatroom` capability accepts a room ID and actor account ID. It permanently removes the room and its dependent records when the actor created the room, is its only remaining participant, or has a current enabled administrator role.

The adapter also publishes `social:messages:resolveRoomMembership`. Given a room ID and requester account ID, it authorizes only an active room member and returns the active member account IDs. Providers use this boundary instead of reading Messages persistence directly.

The New Room picker uses the shared search popup’s `category: "user"` and `typeFilter: "user"` parameters, matching other user-only consumers such as Jitsi Meet, so only user results are offered for conversation creation.

An incoming call is presented as a contributed action bar immediately below the thread header, with its label on the left and provider-owned Answer and Decline SVG actions on the right. Historical call events remain plain timeline records rather than interactive prompts.

The adapter exposes the generic `social:messages:appendRoomEvent` capability for components that need to record a room-scoped timeline event. Its payload stores only neutral event metadata; owning components retain their domain-specific event names and fields. The `messages:formatRoomEvent` browser flow lets those components provide localized presentation without adding their strings or rendering rules to Messages.

### Meeting-owned conversations

`social:messages:resolveGroupChatUrl` accepts `usernames`, optional `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` and `roomId`. The default reuses a group by exact members. `reuseExisting: false` creates a distinct conversation; an explicit saved `roomId` is retained when it exists, regardless of membership changes, and replaced when deleted. New rooms receive their own key and members; reused rooms keep their title. This is a provider-neutral option for independent resources, including meetings.

## Exclusive integration source bindings

`social:messages:sourceBinding` provides `bind` and `release` with `{roomId, actorAccountId, sourceType, sourceId}`. Group resolution also accepts `source: {sourceType, sourceId}`. Authorized room members can claim an unbound room; another source receives `source_conflict` without overwriting it. Repeated claims by the same source are idempotent. Conditional updates arbitrate concurrent claims, and release only removes the matching source. Group resolution and binding operations execute registered ctx flows.

Browser providers obtain `ui:scopedActions` from their scoped ctx. Calling it with `(ctx, moduleId, actions)` registers an executable flow for each named action and returns the published action functions. Use these functions for administration reads and mutations; the host owns flow disposal and stale handles reject after teardown. Backend administrator privileges come from the current enabled account role, rather than caller-supplied role fields.
