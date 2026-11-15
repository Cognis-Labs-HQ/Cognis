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

The standalone profile provider provides `ui:profileAvatarRenderer`. Modules that render profile avatars must declare this ID in `requiresCapabilities`; Cognis then loads the provider before mounting their SPA routes.

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

Existing local accounts continue to work when legacy SSO records are present. Startup does not require a database reset. Legacy SSO sign-in and provisioning are rejected individually until those accounts are recreated with opaque IDs. No account IDs, relationships or meetings are migrated or deleted automatically.

## Sudden connection loss

Transient presence and availability polling stops when Offline Mode begins and resumes after recovery. Manual availability changes retain their existing offline-buffer behavior.

## Durable Queued Results

Queued profile text, posts and bounded image uploads retain their completed result if a view refresh fails. Profile text updates use the returned server data online and an explicit queued projection offline. Failed delivery still retains drafts; a failed follow-up refresh does not invite a duplicate submission.

## Enrolled Offline Workspace

Offline Profile access requires the complete prepared own-profile snapshot: text, posts, connections, preferences and bounded avatar/banner images. Other users’ profiles are blocked even if previously cached.

## Acknowledged Preference Snapshots

Successful Profile preference writes update their bounded, provider-owned read snapshot before later reads, including replay and online-only saves. Offline preference merges retain acknowledged fields and project remaining pending changes. Delayed reads cannot overwrite a newer acknowledged snapshot; account changes, provider disposal and failed writes cannot publish stale data.

## Profile Editing and Roles

Profile edit forms use the owning component’s display-name, bio, location and website limits. Account role synchronization resolves a profile’s public handle from its immutable account ID before updating role and visibility.

`profile:setRole(accountId, role)` → `Promise<void>`.

## Typed Storage and Routes

Profile roles and visibility types match the stored records, including moderator accounts and private, friends and community visibility. Preference reads expose the stored JSON text. Persistence tests use a profile-owned structured database fixture with rollback support.

## Credential Scope

Account operations require verified account sessions. Shared-resource operations explicitly verify guest credentials and recheck the current grant before applying resource permissions. Account names never determine credential type. Revoked or expired access is denied.

## Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's profile, social activity and preferences. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

## Retry Profile Edits

Edit Profile keeps the exact entered fields open until the server acknowledges the save or the account-bound offline buffer durably accepts it. A rejected request, unreadable response or failed buffer write shows an error and restores Save without discarding the draft. Repeated Save clicks and Enter submit only one pending request; fields are temporarily disabled while it runs. Optional card, navbar or local display-name refresh errors do not turn an accepted save into a failed write.

Discard, Close, Escape and the backdrop use the shared unsaved-change confirmation. Cancel in the confirmation retains the form. Confirming Discard closes it and ignores late callbacks; closing cannot undo a request already sent, and an informational toast says so. A save result waits for an open discard decision before updating the page. Navigation, a new mount, account/session changes and popup disposal invalidate old editor callbacks. Reopening uses the last accepted profile, with unique field/label identifiers even while the previous popup animates closed. Unsubmitted drafts are not persisted across navigation or reload.

The Profile-owned editor uses the existing `social:profile:request` ctx flow and preserves its field-validation gate, shared popup focus ownership and offline delivery policy. Synthetic DOM tests exercise the real page mount, popup, form builder and registered request flows with controlled transport and storage. They do not establish live browser layout or server/database behavior.

## Avatar Read Recovery

The navbar and hover previews keep an unchanged image mounted during unrelated refreshes. Temporary network failures and HTTP 408, 425, 429 or 5xx responses do not permanently disable a key. The next explicit refresh or opening can retry; there is no avatar retry timer. Confirmed deletion (404/410), denial (401/403), explicit invalidation, account/token changes and provider removal clear the corresponding image. The profile hero uses the page-owned media lifecycle described below.

The standalone provider owns `ui:profileAvatarRenderer` until its scope ends. Existing `fetch(key)` still returns a URL or null; `hydrate(container, { signal })` accepts optional cancellation, and `invalidate(key)` clears a key (omitting the key clears all). Cache entries are scoped to the account, access token and provider lifetime, coalesce concurrent loads, and are capped at 128 keys. Successful and confirmed-negative reads are revalidated after 60 seconds on demand. A content digest keeps identical bytes on the same URL while changed bytes receive a new URL. Eviction, invalidation and disposal revoke owned object URLs. Detached elements are not retained.

The navbar provider returns `avatarState` (`available`, `missing`, `denied`, `retryable`, `invalid` or `stale`), an optional `avatarKey`, `profileAvailable`, and a required synchronous `renderContent(previousContent, { retainImage })` callback. The callback returns a local DOM element or null, never a promise. Its content has no outer link or button. The host checks account, token, generation, connection and provider lifetime before and after invoking it, preserving its menu button and availability indicator. Only an explicit retryable result can retain an image for the same identity and unchanged or unresolved key. Profile owns image errors, current-name fallback metadata and cache eviction. The provider signal revokes its content immediately. Ship the matching shell assets and Profile 4.0.0 together: the required callback is a breaking navbar-provider change, and a missing or invalid contract produces only the generic unavailable placeholder.

The profile identity tutorial continues to explain profile links and their previews; its controls, progression and completion identity are unchanged.

The renderer also exposes a required truthful `available` flag for dependent presentation providers and emits its own `cognis:profile-avatar-renderer-changed` notification on mount and revocation. Its flag becomes false on scope abort before capability removal; failed mounts and reactivation follow the same notification path. Consumers must not infer readiness merely from registry presence.

## Hero Images

The profile page keeps unchanged avatar and banner image nodes during follower counts, profile edits and other card updates. Explicit synchronization rechecks media and preserves the current image for the same profile, session and key when a network error or HTTP 408, 425, 429 or 5xx prevents a read. A visible error invites a retry; the page does not report that refresh as successful. A successful retry with identical bytes keeps the same URL, while changed bytes replace it.

A changed profile or image key, authoritative null key, confirmed deletion, or denied/missing media (401/403/404/410) clears the former image. Removing an avatar leaves the banner intact, and vice versa. Navigation, repeated mounting, account/token/provider changes and provider disposal cancel old work and release its object URLs. Late profile records, response bodies, image reads, crop results, uploads, deletes and follower refreshes cannot update a newer page. A file picker belongs to the page that opened it.

The Profile client publishes its scoped `social:profilePageSignal` alongside `social:profileRequest`. The hero uses the registered `social:profile:request` and `social:profileMedia:read` flows, bounded two-image ownership and the shared Profile digest reader. Only image nodes are reconciled; the rest of the hero continues updating normally. The composer, shell, navbar, preview authorization and draft-editor contracts remain in force. Ship the Profile 4.0.0 page and provider together.

Regression tests use static jsdom fixtures, actual page exports and registered request/provider lifecycles. They verify node identity, URL release, failure recovery and out-of-order work. They do not establish native browser paint, image decoding or the original reported production trigger.

## Canonical Avatar Content

`ui:profileAvatarRenderer.getPresentation(profile)` derives `label`, `initials`, `colorSeed` and `color` from the already authorized `displayName || handle`. `buildContent({ profile, size, avatarKey, blobUrl, imageClass, imageAlt })` builds noninteractive inner markup. Explicit sizes are `small` (32px, 0.7rem), `medium` (48px, 1.05rem) and `large` (80px, 1.75rem); unknown sizes fail. Profile CSS owns content geometry, typography, color, border and padding. Outer links, menu/upload buttons, placement and availability remain caller-owned. Supplied image URLs and identity records must already be authorized; this presentation API does not fetch or grant access.

Navbar, hover preview and profile hero use these shared rules. An unchanged valid image stays mounted after a display-name update, while a later decode error restores initials for the current name. The preview avatar links to the named profile and keeps its accessible name current; focusing or hovering it does not restart the preview. Hero media remains page-owned and does not join the avatar cache.

The existing `buildMarkup`, `colorSeed`, custom classes, availability, hydration and profile-link options keep their meaning. Messages and Settings previews, Share, Library and Calendar can continue using that contract; this release does not migrate their presentation or external modules. Messages and Calendar tested dependency ceilings advance to Profile 4.0.0. External module ceilings have not been validated and require companion testing before an upgrade. Synthetic DOM tests cover style ordering in both themes, not native browser paint or layout geometry.

## Confirm Profile Actions

Profile confirmation dialogs use a neutral Cancel. Delete, Unfollow and Block are destructive; Unblock is neutral. Repeated actions for the same post or relationship share a pending decision and request. Cancel, Close and Escape make no change. Leaving the page, changing account/session or removing the provider invalidates pending decisions and retained controls.

A rejected or known-unsent action can be confirmed again. When delivery is uncertain, the current page does not resend it: reopen the profile to check the result. A successful server response or durable offline acceptance updates the current view. A failed follow-up refresh reports that the change was accepted; it is not a failed write. Connection refreshes keep successfully loaded lists and retain existing lists on failure.

These controls use the existing social:profile:request flow and page lifetime. Synthetic DOM tests exercise real page mounts, popups, registered request stages and controlled transport. Native browser layout and live server/database behavior are not established by these tests.

### Compact Content Sizes

Profile 4.1.0 adds `tiny` (1.22rem, 0.5rem initials) and `compact` (1.65rem, 0.6rem initials) to `buildContent`. The immutable `contentSizes` list advertises all five supported names. These are graphical footprints, not pointer-target sizes. The caller owns separate accessible targets, spacing and any outer separator ring. Existing `small`, `medium`, `large` and `buildMarkup` options retain their meanings. Consumers requiring the new sizes must validate the advertised list and ship with matching Profile JavaScript and CSS. Messages 2.9.0 uses both sizes; release these assets together. Existing Profile tutorials retain their current avatar controls and sizes.
