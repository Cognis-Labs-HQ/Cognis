# Messages

## Overview

The messages adapter provides one-to-one and group private messaging on top
of the Social Gateway. Chatrooms, memberships, and message bodies are stored
in the database. Message bodies are encrypted client-side with a per-room
symmetric key issued by the server, and additionally re-wrapped at rest with
the server's `DATA_ENCRYPTION_KEY`.

## Endpoints

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
| GET    | `/messages/rooms/:id/key`                           | Fetch unwrapped per-room AES-GCM key (members only).                                    |
| GET    | `/messages/rooms/:id/messages?before&limit`         | Paginated history (incoming pending-request recipients see no messages until approval). |
| POST   | `/messages/rooms/:id/messages`                      | Append message (`ciphertext`, `iv`, optional `authTag`).                                |
| POST   | `/messages/rooms/:id/messages/:messageId/reactions` | Toggle an emoji reaction for the message.                                               |
| POST   | `/messages/rooms/:id/read`                          | Mark room read up to now.                                                               |
| GET    | `/messages/rooms/:id/typing`                        | List active typers in the room (excluding requester).                                   |
| POST   | `/messages/rooms/:id/typing`                        | Update typing state for the current member.                                             |
| POST   | `/messages/rooms/:id/members`                       | Add a member (owner/admin only).                                                        |
| DELETE | `/messages/rooms/:id/members/:handle`               | Remove a member (self-leave or owner kick).                                             |

## Eligibility

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
profile fetch, posts fetch, follow/followers, relationship endpoint, the
lookup endpoint above, and chatroom creation.

## Threat Model

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

## Notification Integration

When a message is appended, the adapter dispatches one notification envelope
per other room member to the notify gateway with category `messages`. The
envelope's `actionUrl` is `/messages/<room-id>` so clicking the in-app
notification opens the conversation. Per-room mute (member.muted) and the
user's `messages` category preference both suppress this dispatch.

The notify gateway's per-user category preferences then determine which
senders fan out (in-app, email, etc.).
