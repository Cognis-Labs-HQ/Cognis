# Profile Adapter

## Overview

The Profile Adapter owns user profiles, the social graph, posts, and file
management for avatar and banner uploads. It gives each Cognis account a
public-facing identity and a place in the community graph. Removing this
adapter removes all profile, social, post, and file features from the
platform without affecting core, auth, or any other component.

The adapter is self-contained: it registers its own API routes, serves the
profile HTML page, contributes capabilities to the store, and owns its
database schema. Core has no knowledge of profiles, follows, blocks, or posts.

## Responsibilities

- Own and initialise the `account_profiles`, `account_follows`,
  `account_blocks`, and `posts` database tables.
- Enforce account-level and post-level visibility on all profile and social
  endpoints.
- Manage the social graph: follow, unfollow, block, unblock, and
  follower/following list queries.
- Handle avatar and banner uploads through the `file:gateway` capability.
- Serve the `/profile` redirect and `/profile/:handle` HTML page.
- Contribute `profile:createProfile`, `profile:setRoleByHandle`,
  `preferences:store`, and `social:profileStore` to the capability store.
- Register all profile, social, post, file, and preference routes.
- Self-register with the Social Gateway via `ctx.gateway.registerAdapter(...)`.

Not responsible for: file storage implementation (files gateway),
authentication (auth gateway), or private messaging (messages adapter).

## Architecture

The adapter bootstrap in `src/adapters/social/profile/index.ts`:

1. Guards on `ctx.dbExecutor` — logs a warning and returns if unavailable.
2. Instantiates `DbProfileStore` and calls `ensureSchema()`.
3. Instantiates `DbUserPreferenceStore`, calls `ensureSchema()`, and
   contributes `preferences:store` and `social:profileStore`.
4. Contributes `profile:createProfile` and `profile:setRoleByHandle`.
5. Retrieves `file:gateway` (optional); registers file routes only when the
   capability is present.
6. Registers profile, social, post, preference, and page-serving routes.
7. Registers a navbar UI plugin via `ctx.registerNavbarPlugin`.
8. Calls `ctx.gateway.registerAdapter({ adapterId: 'profile', adapterName: 'Profile' })`.

### Key source locations

| Path                                                | Purpose                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/adapters/social/profile/index.ts`              | Adapter bootstrap entry point                                          |
| `src/adapters/social/profile/routes/social.ts`      | Follow, unfollow, block, unblock, follower/following routes            |
| `src/adapters/social/profile/routes/posts.ts`       | Post creation, listing, and deletion                                   |
| `src/adapters/social/profile/routes/files.ts`       | File upload, download, and admin size-limit management                 |
| `src/adapters/social/profile/routes/preferences.ts` | User preference get/set                                                |
| `src/adapters/db/reuse/profile-store.ts`            | `DbProfileStore` — all profile, social graph, and post SQL             |
| `src/adapters/db/reuse/preference-store.ts`         | `DbUserPreferenceStore`                                                |
| `src/adapters/social/profile/profile-store.ts`      | Abstract `ProfileStore` interface and `VolatileProfileStore` for tests |
| `src/adapters/social/profile/routes/index.ts`       | Own profile and public profile route handlers                          |

### Visibility model

| Tier               | Profile visible to      | Posts and counts visible to |
| ------------------ | ----------------------- | --------------------------- |
| `hidden` (default) | Self and admin only     | — (posting returns 403)     |
| `private`          | Existing followers only | Followers only              |
| `friends`          | Any authenticated user  | Followers only              |
| `community`        | Any authenticated user  | Any authenticated user      |

Post visibility (`only_me | private | friends | community`) is always capped
by the account's tier. Blocked callers receive 404 on any endpoint targeting
the blocker.

### Capabilities contributed

| Capability                | Type                                          | Description                                             |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `profile:createProfile`   | `(accountId, handle, role?) => Promise<void>` | Creates a profile row; called by auth on register       |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>`             | Syncs role on the profile row when admin changes a role |
| `preferences:store`       | `DbUserPreferenceStore`                       | User preference key/value persistence                   |
| `social:profileStore`     | `DbProfileStore`                              | Profile store shared with the messages adapter          |

## Configuration

The adapter reads `db:executor` and `db:type` from the capability store
(contributed by the database gateway) and optionally `file:gateway`
(contributed by the files gateway). No environment variables are required.
If `db:executor` is absent the adapter logs a warning and exits early without
registering routes or contributing capabilities.

## API Routes

| Method   | Path                                     | Description               | Auth   |
| -------- | ---------------------------------------- | ------------------------- | ------ |
| `GET`    | `/api/v1/social/profile/ping`            | Capability check          | Bearer |
| `GET`    | `/api/v1/social/profile`                 | Own profile               | Bearer |
| `PATCH`  | `/api/v1/social/profile`                 | Update own profile fields | Bearer |
| `PUT`    | `/api/v1/social/profile/avatar`          | Upload avatar             | Bearer |
| `DELETE` | `/api/v1/social/profile/avatar`          | Remove own avatar         | Bearer |
| `PUT`    | `/api/v1/social/profile/banner`          | Upload banner             | Bearer |
| `DELETE` | `/api/v1/social/profile/banner`          | Remove own banner         | Bearer |
| `GET`    | `/api/v1/social/users/:handle/profile`   | Public profile            | Bearer |
| `POST`   | `/api/v1/social/users/:handle/follow`    | Follow a user             | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/follow`    | Unfollow                  | Bearer |
| `POST`   | `/api/v1/social/users/:handle/block`     | Block a user              | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/block`     | Unblock                   | Bearer |
| `GET`    | `/api/v1/social/users/:handle/follow`    | Follower list             | Bearer |
| `GET`    | `/api/v1/social/users/:handle/following` | Following list            | Bearer |
| `POST`   | `/api/v1/social/posts`                   | Create post               | Bearer |
| `GET`    | `/api/v1/social/posts`                   | List own posts            | Bearer |
| `DELETE` | `/api/v1/social/posts/:id`               | Delete post               | Bearer |
| `GET`    | `/api/v1/social/users/:handle/posts`     | List user's posts         | Bearer |
| `PUT`    | `/api/v1/files/:bucket/:key`             | Upload file               | Bearer |
| `GET`    | `/api/v1/files/:bucket/:key`             | Download file             | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key`             | Delete file               | Admin  |

## Live profile updates

Saved profile details are shown immediately. Follower and following totals and their user cards refresh automatically. Profile image selectors accept one active selection or upload at a time.

Follow changes and banner-height selections repaint immediately while their background synchronization completes.

Profile messaging feedback is loaded from profile-owned language resources, so profile rendering does not depend on the Messages adapter being enabled.

## Availability

The profile menu shows the current availability and lets the signed-in user choose Free, Busy, or Tentative. Avatar status lights expose the resolved status as a hover tooltip. Other components can query a user's calendar-aware resolved status by account ID through the `social:getUserAvailability` ctx capability.

## Provided UI capabilities

The profile navbar plugin provides `ui:profileAvatarRenderer`. Modules that render profile avatars must declare this ID in `requiresCapabilities`; Cognis then loads the provider before mounting their SPA routes.

### Browser client capability

`social:profileUiClient` is contributed by a standalone profile provider before dependent pages mount and exposes `getCurrentProfile()` so browser modules obtain profile data through the owning adapter client.

## External Visibility

`profile:applyExternalProfile` accepts `profileVisibility` values of `hidden`, `private`, `friends`, or `community`. A valid value becomes the persisted profile visibility after profile creation or synchronization; unknown values are ignored.

## Unknown availability without lookup errors

GET availability returns a successful unknown status for a missing or privacy-restricted profile. Both cases have the same response shape and never query its manual preference or calendar status. Existing owner, block, community, friend and private visibility rules remain enforced; writes still require the owner. Avatar indicators display unknown without repeated not-found errors.

## Offline Social Changes

Profile and Messages providers now register lifecycle-scoped HTTP actions through ctx. Previously loaded profiles, posts, room lists and encrypted threads remain available in the verified tab. Profile text, availability, follow/block state, banner layout, post creation/deletion, existing-room encrypted messages, final reaction states and read receipts use the account-bound offline buffer. Later online edits wait behind buffered edits from the same owner. Account or session changes during preparation or buffer waits cancel the action. Message/post creation uses stable `operationId` UUIDs; changed or cross-account retries are rejected, and message replay does not repeat notifications. Read receipts retain the original read time.

Chat is encrypted before buffering: plaintext, room keys and credentials are never added to the queue. Profile text and post content are stored in browser storage for the current account. Avatar/banner uploads up to 350,000 binary bytes may share the existing 1 MB/1,000-record/seven-day queue; larger images require connectivity. A full buffer reports a localized error; message and post drafts are cleared only after durable submission succeeds. These limits apply to the complete buffer, not each component separately.

Queued changes remain pending until server acknowledgement. Messages show a queued status; profile/post/media actions use the standard queued toast. Browser close and reload trigger the native unsaved-changes confirmation whenever the current account has buffered records, including records owned by disabled providers. The warning clears after acknowledgement or explicit account cleanup. Browsers control the confirmation wording and may require user interaction before showing it. Pending records still survive reload; the warning protects unacknowledged work and does not discard it.

Cached social content remains tab-local and consent-gated. First visits, private offline reloads, creating rooms, membership/key management, calls and large uploads require connectivity. Typing and presence are transient and are not replayed. Current server authorization is checked on replay; offline snapshots cannot reveal remote revocations. ToS consent is still mandatory before access and replay.

## Profile Startup

Profile availability starts from the provider mount after its buffered client has been registered and avatar styles are ready. Importing the provider does not start presence callbacks or polling. Disable and failed mounts remove subscriptions, page listeners, timers and cached availability; stale asynchronous work cannot update a later provider scope. This prevents online administration pages from raising `profile_client_unavailable` during initialization.

## Public Handles

Public SSO profile handles omit provider namespaces. Existing provider-prefixed public handles are replaced at profile initialization, and collisions receive a random suffix. Existing provider-neutral handles remain stable. Account IDs, identity mappings, posts and relationships are unchanged. Public profile URLs change when their handles change. Provider metadata and email/login details remain in the administrator-only Users interface, whose per-account disclosures use the shared collapsible section styles and fetch authorized metadata when opened.

## Account privacy and keyring isolation

SSO accounts use opaque random IDs. Provider IDs are stored separately and exposed only to administrators; public usernames never include them. Auth reserves usernames before profile or email side effects: duplicate names within one provider are rejected, while different providers receive a short random suffix when needed. Users lists and action endpoints distinguish public `username` from internal `accountId`.

This is a clean break with no account-ID migration. Stop the instance and reset databases containing provider-bearing SSO account IDs before upgrading; Authentication refuses startup with `provider_account_ids_require_clean_database` rather than serve those IDs. Existing relationships and meetings are not migrated.
