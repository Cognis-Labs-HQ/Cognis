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

## Offline Social Changes

Profile and Messages providers now register lifecycle-scoped HTTP actions through ctx. Previously loaded profiles, posts, room lists and encrypted threads remain available in the verified tab. Profile text, availability, follow/block state, banner layout, post creation/deletion, existing-room encrypted messages, final reaction states and read receipts use the account-bound offline buffer. Later online edits wait behind buffered edits from the same owner. Account or session changes during preparation or buffer waits cancel the action. Message/post creation uses stable `operationId` UUIDs; changed or cross-account retries are rejected, and message replay does not repeat notifications. Read receipts retain the original read time.

Chat is encrypted before buffering: plaintext, room keys and credentials are never added to the queue. Profile text and post content are stored in browser storage for the current account. Avatar/banner uploads up to 350,000 binary bytes may share the existing 1 MB/1,000-record/seven-day queue; larger images require connectivity. A full buffer reports a localized error; message and post drafts are cleared only after durable submission succeeds. These limits apply to the complete buffer, not each component separately.

Queued changes remain pending until server acknowledgement. Messages show a queued status; profile/post/media actions use the standard queued toast. Browser close and reload trigger the native unsaved-changes confirmation whenever the current account has buffered records, including records owned by disabled providers. The warning clears after acknowledgement or explicit account cleanup. Browsers control the confirmation wording and may require user interaction before showing it. Pending records still survive reload; the warning protects unacknowledged work and does not discard it.

Cached social content remains tab-local and consent-gated. First visits, private offline reloads, creating rooms, membership/key management, calls and large uploads require connectivity. Typing and presence are transient and are not replayed. Current server authorization is checked on replay; offline snapshots cannot reveal remote revocations. ToS consent is still mandatory before access and replay.

## Offline navigation

Messages enables offline navigation only when the current account and session have a cached room list and prepared page assets. Threads still require their cached encrypted messages and an unlocked keyring; uncached conversations require connectivity. Provider redraws preserve the disabled state of offline links.

## Durable Queued Results

Encrypted messages clear their draft only after server acknowledgement or durable queuing. A later room-refresh failure cannot relabel that receipt as a failed send. Pending messages retain their stable operation identity for replay.

## Offline Availability

Messages prepares its room list, translations and emoji catalogs after verified sign-in. With prepared page assets and a cached room list, the page can open offline before its first online visit. Only rooms with cached metadata and threads open automatically; selecting an uncached thread shows a targeted information toast. Room registration and asset availability survive repeated bundled and directly served imports.

## Independent Emoji Usage

The reusable Messages reaction picker records emoji frequency independently of reaction changes. Only the message-reaction request includes the final active state. Usage-recording failures are logged without preventing the selected reaction or its update callback.
