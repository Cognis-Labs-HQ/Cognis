# Technical Reference

The public interfaces and operational rules of Messages.

## Interfaces

### Endpoints

All endpoints are prefixed with `/api/v1/social/messages`. Authentication is
required for everything except `GET /messages/ping`, which is a lightweight
probe used by the UI to detect whether the adapter is loaded.

| Method | Path                                                | Description                                                                             |
| ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/messages/ping`                                    | Adapter availability probe (returns `{ ready: true }`).                                 |
| GET    | `/messages/users/lookup?q=…`                        | Search profiles for messaging recipients (handle match).                                |
| GET    | `/messages/rooms`                                   | List rooms for current user (with last message preview and unread count).               |
| POST   | `/messages/rooms`                                   | Create a DM or group; body lists handles. DM may open in pending-request mode.          |
| GET    | `/messages/requests`                                | List pending incoming message requests for current user.                                |
| POST   | `/messages/requests/:id/approve`                    | Approve request and create/open the DM room.                                            |
| POST   | `/messages/requests/:id/reject`                     | Reject a pending message request and remove the recipient from the pending DM room.     |
| GET    | `/messages/rooms/:id`                               | Room metadata + members.                                                                |
| GET    | `/messages/rooms/:id/messages?before&limit`         | Paginated history (incoming pending-request recipients see no messages until approval). |
| POST   | `/messages/rooms/:id/messages`                      | Append message (`ciphertext`, `iv`, optional `authTag`).                                |
| POST   | `/messages/rooms/:id/messages/:messageId/reactions` | Toggle an emoji reaction for the message.                                               |
| POST   | `/messages/rooms/:id/read`                          | Mark room read up to now.                                                               |
| GET    | `/messages/rooms/:id/typing`                        | List active typers in the room (excluding requester).                                   |
| POST   | `/messages/rooms/:id/typing`                        | Update typing state for the current member.                                             |
| POST   | `/messages/rooms/:id/members`                       | Add a member (owner/admin only).                                                        |
| DELETE | `/messages/rooms/:id/members/:handle`               | Remove a member (self-leave or owner kick).                                             |

## Configuration

Rooms declare participants and encryption/access state. Templates and drafts are account-scoped; offline availability requires prepared assets plus cached metadata and threads.

## Behavior

### Messages browser client

New group rooms finish key generation and all member insertions before claiming an integration source. Any setup or binding failure deletes the partial room; cleanup failures are logged and propagated. Existing rooms and source exclusivity keep their current behavior.

The Messages browser client lets modules list room messages, open private rooms, and send messages through the Social Messages adapter's authenticated API contract.

### Meeting-owned conversations

`social:messages:resolveGroupChatUrl` accepts `usernames`, optional `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` and `roomId`. The default reuses a group by exact members. `reuseExisting: false` creates a distinct conversation; an explicit saved `roomId` is retained when it exists, regardless of membership changes, and replaced when deleted. New rooms receive their own key and members; reused rooms keep their title. This is a provider-neutral option for independent resources, including meetings.

### Exclusive integration source bindings

`social:messages:sourceBinding` provides `bind` and `release` with `{roomId, actorAccountId, sourceType, sourceId}`. Group resolution also accepts `source: {sourceType, sourceId}`. Authorized room members can claim an unbound room; another source receives `source_conflict` without overwriting it. Repeated claims by the same source are idempotent. Conditional updates arbitrate concurrent claims, and release only removes the matching source. Group resolution and binding operations execute registered ctx flows.

Browser providers obtain `ui:scopedActions` from their scoped ctx. Calling it with `(ctx, moduleId, actions)` registers an executable flow for each named action and returns the published action functions. Use these functions for administration reads and mutations; the host owns flow disposal and stale handles reject after teardown. Backend administrator privileges come from the current enabled account role, rather than caller-supplied role fields.

### Offline Social Changes

Profile and Messages providers now register lifecycle-scoped HTTP actions through ctx. Previously loaded profiles, posts, room lists and encrypted threads remain available in the verified tab. Profile text, availability, follow/block state, banner layout, post creation/deletion, existing-room encrypted messages, final reaction states and read receipts use the account-bound offline buffer. Later online edits wait behind buffered edits from the same owner. Account or session changes during preparation or buffer waits cancel the action. Message/post creation uses stable `operationId` UUIDs; changed or cross-account retries are rejected, and message replay does not repeat notifications. Read receipts retain the original read time.

Chat is encrypted before buffering: plaintext, room keys and credentials are never added to the queue. Profile text and post content are stored in browser storage for the current account. Avatar/banner uploads up to 350,000 binary bytes may share the existing 1 MB/1,000-record/seven-day queue; larger images require connectivity. A full buffer reports a localized error; message and post drafts are cleared only after durable submission succeeds. These limits apply to the complete buffer, not each component separately.

Queued changes remain pending until server acknowledgement. Messages show a queued status; profile/post/media actions use the standard queued toast. Browser close and reload trigger the native unsaved-changes confirmation whenever the current account has buffered records, including records owned by disabled providers. The warning clears after acknowledgement or explicit account cleanup. Browsers control the confirmation wording and may require user interaction before showing it. Pending records still survive reload; the warning protects unacknowledged work and does not discard it.

Cached social content remains tab-local and consent-gated. First visits, private offline reloads, creating rooms, membership/key management, calls and large uploads require connectivity. Typing and presence are transient and are not replayed. Current server authorization is checked on replay; offline snapshots cannot reveal remote revocations. ToS consent is still mandatory before access and replay.

### Offline navigation

Messages enables offline navigation only when the current account and session have a cached room list and prepared page assets. Threads still require their cached encrypted messages and an unlocked keyring; uncached conversations require connectivity. Provider redraws preserve the disabled state of offline links.

### Durable Queued Results

Encrypted messages clear their draft only after server acknowledgement or durable queuing. A later room-refresh failure cannot relabel that receipt as a failed send. Pending messages retain their stable operation identity for replay.

### Offline Availability

Messages prepares its room list, translations, sidebar template and emoji catalogs after verified sign-in. With prepared page assets and a cached room list, the page can open offline before its first online visit. Only rooms with cached metadata and threads open automatically; selecting an uncached thread shows a targeted information toast. Room registration and asset availability survive repeated bundled and directly served imports.

### Independent Emoji Usage

See the [shared contract](/docs/api/technical) for this behavior.

### Readable Mobile Content

Open conversations with the common double-chevron sidebar button at the top left. Room headings use two visible lines while retaining their full accessible title; more space remains for message history and drafts survive rotation.

### Compact Sidebars

Messages keeps New Room, conversations and Templates together, filling the available sidebar width. Empty and short lists no longer stretch to the drawer height; long room and template lists use Composer’s single scroll surface.

### Overview

The messages adapter provides one-to-one and group private messaging on top
of the Social Gateway. Chatrooms, memberships, and message bodies are stored
in the database. Message bodies are encrypted client-side with a per-room
symmetric key issued by the server, and additionally re-wrapped at rest with
the server's `DATA_ENCRYPTION_KEY`.

### Eligibility

A user **A** can open a direct room with user **B** when:

1. Neither has blocked the other, AND
2. Both users are visible (not hidden), AND
3. A follows B and B follows A.

When the users are visible and unblocked but do not mutually follow each other,
`POST /messages/rooms` returns `202` with room + request metadata, so the
requester can enter the chat immediately. The recipient sees an approval banner
in the room and cannot view pending messages until approving.

Message requests are pair-scoped (user-to-user), not room-scoped: once a pair
has an approved request history, future direct chats between the same two
accounts can be created directly without requesting again, as long as neither
account is blocked and both profiles remain visible.

If a two-member chat is left by one participant, the remaining participant keeps
the room in an archived state (shown in a dedicated archived sidebar section)
and cannot send new messages from that archived room. Messaging the same user
again creates a fresh direct room.

The same predicate is exposed via the social gateway's
`GET /api/v1/social/users/:handle/relationship` endpoint (`canMessage`,
`canSendMessageRequest`, `requiresMessageRequest`) so the profile UI can decide
whether to open a room immediately or send a message request.

Block enforcement covers every entry point that touches another user:
profile fetch, posts fetch, follow/follow, relationship endpoint, the
lookup endpoint above, and chatroom creation.

### Threat Model

The plan calls for "basic client-server-client encryption", which this
adapter implements as follows:

### What is protected

- **In transit** — messages are protected by the existing TLS termination at
  the front of the deployment. No plaintext message body ever travels in the
  clear.
- **In the database** — message bodies are encrypted twice. First, the client
  encrypts the plaintext with a per-room AES-GCM key (32 random bytes,
  generated server-side at room creation). Second, that ciphertext is stored
  alongside its IV and (optionally) the GCM auth tag. The per-room key
  itself is wrapped on disk with `deriveScopedKey('social:messages:room:<id>',
DATA_ENCRYPTION_KEY)` before being persisted in `chatroom_keys`. A
  database-only compromise reveals only ciphertext.
- **Across processes/restarts** — `DATA_ENCRYPTION_KEY` must be set in the
  environment for production deployments. The notify and messages adapters
  fail loudly under `NODE_ENV=production` when the key is unset.

### What is not protected (and why)

- **Server compromise** — this adapter is _not_ end-to-end encrypted. The
  server holds the unwrapped per-room key (after stripping the at-rest wrap)
  and serves it to authorized members via TLS. Anyone with full server
  access (process memory, server secret, and DB) can decrypt all messages.
  True E2E would require per-account keypairs, key backup, multi-device key
  exchange, key rotation, and out-of-band trust establishment — significantly
  more code and UX work than "basic" implies. The plan explicitly defers
  this; the current contract is suitable for trust-the-host deployments.
- **Operator-level metadata** — sender, recipient, room membership, send
  timestamps, message ordering, and ciphertext lengths are all visible to
  the operator. Only the message body content is hidden.
- **Forward secrecy** — there is no per-message ratchet. A single room key
  decrypts every message ever sent in that room. Rotating the key is a
  manual operation today.

### Recommended hardening for stronger guarantees

If a deployment requires confidentiality against the operator, we recommend:

1. Switch to per-account keypair-based E2E (libsignal-style), with the
   server retaining only opaque ciphertext envelopes.
2. Add per-message Diffie-Hellman ratchet for forward secrecy.
3. Add out-of-band identity verification (safety numbers).
4. Plan for key backup, multi-device sync, and rekey on compromise.

The current adapter intentionally does not implement these — they should
land in a follow-up iteration with explicit product sign-off on the UX
trade-offs (account recovery, multi-device, etc.).

### Notification Integration

When a message is appended, the adapter dispatches one notification envelope
per other room member to the notify gateway with category `messages`. The
envelope's `actionUrl` is `/messages/<room-id>` so clicking the in-app
notification opens the conversation. Per-room mute (member.muted) and the
user's `messages` category preference both suppress this dispatch.

The notify gateway's per-user category preferences then determine which
senders fan out (in-app, email, etc.).

### Room membership timeline events

Membership changes are persisted atomically with passive `member_joined` and `member_left` entries in the room's `chat_messages` timeline. These entries use the `application/vnd.cognis.room-event+json` content type; callers change membership and do not create a second room or separately publish an event. Meeting chat resolution applies the same operation to every resolved participant.

A message request does not create a chatroom. The direct-message room, key, memberships, and initial join events are created only when the recipient approves the request, preventing request-only rooms from appearing in either participant's room list.

### Contextual keyring loading

The Messages page resolves room keys through the `Social Messages` keyring scope. Opening the page requests access to load existing chat secrets; a cancelled unlock does not fall through to a second prompt for saving a delivered key. When an unlock succeeds or is restored after reload, the page refreshes both room-list previews and the active conversation so ciphertext placeholders are replaced immediately.

### Typed Storage and Routes

Social profile roles and visibility declarations now match stored records. Messages and profile routes retain their authorization checks while their callbacks, notification envelopes and database commands use explicit contracts. Missing guest-session resolution still fails before a guest profile is read.

### Credential Scope

Shared behavior: [Auth](/docs/gateways/auth/technical).

### Message Text Wrapping

Message text wraps to the available conversation width in the default, speech-bubble and IRC styles. Short messages stay on one line when they fit. Explicit line breaks, Markdown formatting and literal HTML-like text retain their existing presentation; long unbroken text can wrap inside the message. The same behavior applies to incoming and outgoing messages without changing avatars, reactions or delivery metadata.

The room-history step covers the same conversation region in the default, speech-bubble and IRC styles. Messages wrap within that region while preserving authored line breaks and Markdown. The guide keeps its existing targets, sequence and completion identity.

### Async Conversation Updates

Only the latest selected conversation can update its header, messages, keys and actions. Switching rooms or leaving Messages invalidates pending view updates. Drafts belong to their original room for the current page lifetime.

You can start the next draft while a message sends. Acknowledgement or durable queuing clears only the submitted draft revision, preserving newer edits and drafts in other rooms. Repeated submission is blocked while the send is pending. If the conversation cannot refresh afterward, the message remains sent or queued and a toast advises against resending it.

Unread badges change only after a successful read-status acknowledgement. A failure preserves the unread count and shows a localized toast once for the ongoing failure; a successful acknowledgement allows a later failure to be reported again.

Background update failures show a localized notice and retain the current drafts. Repeated failures are logged, but the notice is shown again only after recovery or a new conversation selection. Late failures from a room or account you have left cannot show stale send errors, start follow-up reads, or interrupt the current conversation. Leaving and reopening Messages also ends the old view’s pending updates.

Reaction changes and Load Earlier keep their results within the conversation where they started. Current failures show a localized update notice and are logged without message contents; failures from a room, account or page you have left are ignored. These actions do not retry automatically. The Preview tutorial covers formatting, links and line breaks; it does not describe attachments.

The message-input step explains that you can start the next draft while a message sends. Only the submitted version clears after acknowledgement or durable queuing; newer edits remain. The input and preview keep their separate targets and existing order.

### Stable Message Selection

Selecting unchanged message text keeps the same DOM range, including its direction and offsets, when incoming messages, reactions or reader metadata update the thread. This applies to all three message styles and selections spanning adjacent messages. If the selected text itself changes or disappears, native selection rules apply; the client does not restore stale text.

Load Earlier retains already loaded messages while live updates arrive. Server-page fullness and pagination cursors exclude locally queued messages. Duplicate pages do not duplicate rows. Scrolled-up views retain their anchor, while views near the bottom follow new content. Room, account, key, style and remount changes establish a separate view.

An acknowledged reaction on an older visible message updates its active state immediately, including durable offline queuing. The existing message-list contract then refreshes that message’s page for reaction metadata without replacing unchanged bodies. A failed refresh reports the current update error while retaining the acknowledged state and selected text, for both recent and older messages; it does not retry the mutation.

Real-DOM regression tests use the exact, test-only jsdom development dependency, compatible with the repository’s supported Node version. They exercise the exported renderer, DOM nodes, Range/Selection, interaction payloads and actual offline projection. Supplied geometry tests the scroll policy; these tests do not measure browser layout, touch selection or clipboard behavior.

Queued projections have their own request order, independent of remote history merging. A late response cannot remove newer queued messages, resurrect cleared pending work, or replace an acknowledged row with its queued copy. Unchanged polls advance that order too. Discarding a response’s queued projection invalidates its signature so the next poll can reconcile fresh data.

Latest-page requests also retain their publication order. A late live response cannot remove newer acknowledged messages or replace newer metadata. Older latest snapshots are discarded; explicit history requests still merge. Stale failures leave newer published content intact.

Reads and acknowledged reactions share the current view’s ordering. Overlapping historical reads retain newer per-message metadata, and a complete live page prevents an older read from resurrecting absent rows. Full limited pages do not infer absence at their oldest tied timestamp; `before` remains exclusive. Coverage exists only while older reads are active: overlapping ranges with the same authority relative to those reads coalesce, then disappear when the reads finish. A stalled read therefore does not accumulate one range per poll. Superseded follow-up read errors stay silent; current read errors and failed mutations remain visible.

The scoped client’s `x-cognis-read-source` header distinguishes a new transport (`live`), a subscriber to an already-started transport (`shared`), and a stored or restored snapshot (`cached`). Shared and cached remote rows cannot overwrite displayed metadata or delete loaded rows. They may fill a missing older prefix unless a live result established its end. An empty cached prefix ends currently readable history, not server history; a later live result can reopen it. Queued projections still reconcile separately. Source-tagged signatures let genuinely fresh responses update retained metadata even when their payload matches an older snapshot.

The renderer returns an explicit obsolete outcome when its room, account, key, style or container ownership has changed. Action, room-opening and background-refresh callers stop without error notices, read-status writes or typing follow-ups for that outcome; current read failures remain distinct.

The room-history step explains selecting text during conversation updates and loading earlier messages while retaining your place. Its region, sequence, completion identity and access rules are unchanged.

### Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's room memberships and messaging activity. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

### Read-only Presentation

The browser provider exposes `social:messagePresentation` version 2 through its lifecycle-scoped ctx. `render({ style, records, currentAccountId })` runs `messages:presentConversation` with `validate` and `render` stages and returns non-interactive markup. Each record supplies string `id`, `senderId`, `senderDisplayName`, `senderHandle`, `text` and ISO `createdAt`. Only those presentation fields are accepted into the rendering snapshot. The provider advertises its shared stylesheets and an abort signal; consumers listen for `cognis:message-presentation-changed` and stop using a revoked provider. Live threads and read-only presentations share the same row/body renderer. The read-only path never fetches rooms, hydrates avatars, registers search, produces receipts or persists content. Synthetic consumers provide their own localized records and labels.

### Preview Readiness

The version 2 contract requires an `available` boolean. It is true only while the Messages scope and the current Profile avatar renderer are active. Profile owns `cognis:profile-avatar-renderer-changed`; Messages relays changes through `cognis:message-presentation-changed`. Revocation is visible before registry removal. Pending renders are fenced by dependency generation, including removal and return of the same renderer object. Missing or rolled-back Profile providers therefore hide the preview rather than presenting an available capability that cannot render. Reactivation restores the currently selected unsaved style without a Settings reload or preference write. The relay is removed when Messages ends.

Release matching Settings assets, Messages 2.8.1 and Profile 3.0.19 together. Settings accepts version 2 with `available: true`; version 1 and missing readiness fields are not compatibility fallbacks. The shared live-thread renderer and its selection/update behavior are unchanged.

### Confirmation Ownership

Leave applies only to the conversation and membership shown when you open its confirmation. Switching rooms, leaving the page, changing account or session, or losing membership makes that choice inactive. Repeated openings share one pending action. Cancel, Escape, the close control and the backdrop do not leave a room. Safe Cancel is neutral; Leave and template Delete use the destructive style.

A confirmed leave is sent once through the registered Messages client. A known rejection permits a new confirmation. An uncertain response is not replayed, and an acknowledged leave stays acknowledged if refreshing fails. The page retains known rooms when it cannot obtain a fresh successful list; reopen Messages to reconcile the result. Late results cannot navigate or notify a replacement view.

Template editors and Delete confirmations belong to the original page, room selection, account, session and saved-template snapshot. Only one template popup is active at a time. Newer or reset preferences make older controls inactive, preserving the newer list rather than overwriting it. Successful persistence happens once.

Messages 2.8.2 is a browser ownership patch. Server routes, membership policy and the version 2 read-only presentation contract are unchanged. Profile remains 4.0.0. The broader confirmation audits remain partial.

The registered Messages request client accepts an optional synchronous `beforeDispatch()` assertion for live transport. It runs after request-flow preparation and is removed before HTTP; it is never stored or replayed. Leave uses it to recheck the original view, account, session, member, handle and request provider immediately before dispatch. A cancelled preparation remains not dispatched and permits a fresh confirmation; only a started transport can have an uncertain outcome.

### Confirmation Ownership

The room-management step explains the Leave confirmation and safe cancellation. Its existing header target, optional availability, step order and completion identity are unchanged. Template editing and deletion retain their sidebar controls; their dialogs stop applying when the initiating page, selection or saved list changes.

### Conversation Avatars

The room-history step explains profile-matched initials and avatar hover/click actions in styles that show avatars. Its region, optionality, step order and completion identity remain unchanged.

### Conversation Avatars

Conversation authors use the current Profile renderer for initials, colour and the small avatar size (32px). Initials follow the display name, then the handle; an account identifier remains the label when neither is available. Existing avatar images and profile links remain available in avatar-bearing styles. Hover opens the standard profile preview and clicking opens the profile. IRC continues to hide avatars.

The Settings Message Style preview uses the same small presentation with synthetic records, without profile links, images, hydration or writes. Missing, disabled or incomplete Profile providers make the preview unavailable; returning providers restore it. Conversation rows keep their current page and account ownership, selection, drafts and read outcomes. Room headers, participant summaries and other avatar surfaces are unchanged; the broader avatar audit remains partial.

Messages 2.8.3 / Profile 4.0.0.

### Read Receipt Details

Select **Seen by** beside a sent message to see its readers and read times. The panel works with a tap, click or keyboard activation. Close or Escape returns to the current button; Escape dismisses an active profile preview first. Tab follows the normal page order. Hover or focus a reader avatar for the standard profile preview; select it to open that profile. Records without a profile handle show a named, unlinked avatar. Reader icons do not show availability. Small circles retain their visual size inside separate, nonoverlapping 44px targets; long lists wrap and the detail panel scrolls within the viewport.

The page binds `social:messageReceipts` to the Messages provider and page lifetime. Opening runs `messages:openReadReceipts` through `validate` and `present`. A new thread snapshot, room/session change, provider removal, scroll, navigation or page disposal closes the panel and cancels pending work without returning focus to obsolete controls. Profile owns image hydration, error recovery and the canonical display-label colour. Messages 2.9.0 requires Profile 4.1.0 content sizes and matching CSS; release both asset sets together. An older renderer is rejected rather than resized or replaced. The read-only `social:messagePresentation` v2 contract remains unchanged. The Room History tutorial explains both the reader-detail button and profile avatars, including when no receipts are present.

## Security

Room eligibility, membership changes and message reads are authorized independently. Encrypted rooms depend on client-held keys; the threat model below distinguishes protected content from visible routing metadata.

## Reference

### Technical specification

The client returns the original `Response` for caller-owned status and payload handling. It URI-encodes room IDs, keeps route knowledge inside the owning adapter, forwards optional access tokens and access-denied suppression, sends JSON for writes, and is available only while the Social gateway and Messages adapter are enabled.

The public `social:messages:deleteChatroom` capability accepts a room ID and actor account ID. It permanently removes the room and its dependent records when the actor created the room, is its only remaining participant, or has a current enabled administrator role.

The adapter also publishes `social:messages:resolveRoomMembership`. Given a room ID and requester account ID, it authorizes only an active room member and returns the active member account IDs. Providers use this boundary instead of reading Messages persistence directly.

The New Room picker uses the shared search popup’s `category: "user"` and `typeFilter: "user"` parameters, matching other user-only consumers such as Jitsi Meet, so only user results are offered for conversation creation.

An incoming call is presented as a contributed action bar immediately below the thread header, with its label on the left and provider-owned Answer and Decline SVG actions on the right. Historical call events remain plain timeline records rather than interactive prompts.

The adapter exposes the generic `social:messages:appendRoomEvent` capability for components that need to record a room-scoped timeline event. Its payload stores only neutral event metadata; owning components retain their domain-specific event names and fields. The `messages:formatRoomEvent` browser flow lets those components provide localized presentation without adding their strings or rendering rules to Messages.

### Technical Specification

| Page / surface       | Guide           | Access         |
| -------------------- | --------------- | -------------- |
| `^/messages(?:/\|$)` | Messaging Guide | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

The router signal bounds tutorial registrations and the page composer. Scrolling retains tutorial controls; a temporarily lost displayed target is recovered without silently advancing.

The walkthrough explains composing once, targeting the message input and then its preview control separately.

Room management is excluded from the path and count until a room header is available.

The compact conversation-picker step targets the visible Composer sidebar control. Desktop sessions omit this hidden action from both progression and the displayed step count. Sidebar sizing and draft retention are described in [Messages](/docs/adapters/social/messages).
