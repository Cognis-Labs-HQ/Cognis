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

## Typed Storage and Routes

Social profile roles and visibility declarations now match stored records. Messages and profile routes retain their authorization checks while their callbacks, notification envelopes and database commands use explicit contracts. Missing guest-session resolution still fails before a guest profile is read.

## Credential Scope

Account operations require verified account sessions. Shared-resource operations explicitly verify guest credentials and recheck the current grant before applying resource permissions. Account names never determine credential type. Revoked or expired access is denied.

## Message Text Wrapping

Message text wraps to the available conversation width in the default, speech-bubble and IRC styles. Short messages stay on one line when they fit. Explicit line breaks, Markdown formatting and literal HTML-like text retain their existing presentation; long unbroken text can wrap inside the message. The same behavior applies to incoming and outgoing messages without changing avatars, reactions or delivery metadata.

## Async Conversation Updates

Only the latest selected conversation can update its header, messages, keys and actions. Switching rooms or leaving Messages invalidates pending view updates. Drafts belong to their original room for the current page lifetime.

You can start the next draft while a message sends. Acknowledgement or durable queuing clears only the submitted draft revision, preserving newer edits and drafts in other rooms. Repeated submission is blocked while the send is pending. If the conversation cannot refresh afterward, the message remains sent or queued and a toast advises against resending it.

Unread badges change only after a successful read-status acknowledgement. A failure preserves the unread count and shows a localized toast once for the ongoing failure; a successful acknowledgement allows a later failure to be reported again.

Background update failures show a localized notice and retain the current drafts. Repeated failures are logged, but the notice is shown again only after recovery or a new conversation selection. Late failures from a room or account you have left cannot show stale send errors, start follow-up reads, or interrupt the current conversation. Leaving and reopening Messages also ends the old view’s pending updates.

Reaction changes and Load Earlier keep their results within the conversation where they started. Current failures show a localized update notice and are logged without message contents; failures from a room, account or page you have left are ignored. These actions do not retry automatically. The Preview tutorial covers formatting, links and line breaks; it does not describe attachments.

## Stable Message Selection

Selecting unchanged message text keeps the same DOM range, including its direction and offsets, when incoming messages, reactions or reader metadata update the thread. This applies to all three message styles and selections spanning adjacent messages. If the selected text itself changes or disappears, native selection rules apply; the client does not restore stale text.

Load Earlier retains already loaded messages while live updates arrive. Server-page fullness and pagination cursors exclude locally queued messages. Duplicate pages do not duplicate rows. Scrolled-up views retain their anchor, while views near the bottom follow new content. Room, account, key, style and remount changes establish a separate view.

An acknowledged reaction on an older visible message updates its active state immediately, including durable offline queuing. The existing message-list contract then refreshes that message’s page for reaction metadata without replacing unchanged bodies. A failed refresh reports the current update error while retaining the acknowledged state and selected text, for both recent and older messages; it does not retry the mutation.

Real-DOM regression tests use the exact, test-only jsdom development dependency, compatible with the repository’s supported Node version. They exercise the exported renderer, DOM nodes, Range/Selection, interaction payloads and actual offline projection. Supplied geometry tests the scroll policy; these tests do not measure browser layout, touch selection or clipboard behavior.

Queued projections have their own request order, independent of remote history merging. A late response cannot remove newer queued messages, resurrect cleared pending work, or replace an acknowledged row with its queued copy. Unchanged polls advance that order too. Discarding a response’s queued projection invalidates its signature so the next poll can reconcile fresh data.

Latest-page requests also retain their publication order. A late live response cannot remove newer acknowledged messages or replace newer metadata. Older latest snapshots are discarded; explicit history requests still merge. Stale failures leave newer published content intact.

Reads and acknowledged reactions share the current view’s ordering. Overlapping historical reads retain newer per-message metadata, and a complete live page prevents an older read from resurrecting absent rows. Full limited pages do not infer absence at their oldest tied timestamp; `before` remains exclusive. Coverage exists only while older reads are active: overlapping ranges with the same authority relative to those reads coalesce, then disappear when the reads finish. A stalled read therefore does not accumulate one range per poll. Superseded follow-up read errors stay silent; current read errors and failed mutations remain visible.

The scoped client’s `x-cognis-read-source` header distinguishes a new transport (`live`), a subscriber to an already-started transport (`shared`), and a stored or restored snapshot (`cached`). Shared and cached remote rows cannot overwrite displayed metadata or delete loaded rows. They may fill a missing older prefix unless a live result established its end. An empty cached prefix ends currently readable history, not server history; a later live result can reopen it. Queued projections still reconcile separately. Source-tagged signatures let genuinely fresh responses update retained metadata even when their payload matches an older snapshot.

The renderer returns an explicit obsolete outcome when its room, account, key, style or container ownership has changed. Action, room-opening and background-refresh callers stop without error notices, read-status writes or typing follow-ups for that outcome; current read failures remain distinct.

## Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's room memberships and messaging activity. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.
