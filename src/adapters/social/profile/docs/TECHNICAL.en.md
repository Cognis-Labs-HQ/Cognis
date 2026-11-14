# Technical Reference

The public interfaces and operational rules of Profiles and Posts.

## Interfaces

### Architecture

The adapter bootstrap in `src/adapters/social/profile/index.ts`:

1. Guards on `ctx.capabilities.get("db:executor")` — logs a warning and returns if unavailable.
2. Instantiates `DbProfileStore` and calls `ensureSchema()`.
3. Instantiates `DbUserPreferenceStore`, calls `ensureSchema()`, and
   contributes `preferences:store` and `social:profileStore`.
4. Contributes `profile:createProfile` and `profile:setRoleByHandle`.
5. Retrieves `file:gateway` (optional); registers file routes only when the
   capability is present.
6. Registers profile, social, post, preference, and page-serving routes.
7. Registers a navbar UI plugin via `ctx.registerNavbarPlugin`.
8. Calls `ctx.gateway.registerAdapter({ adapterId: 'profile', adapterName: 'Profile' })`.

### Capabilities contributed

| Capability                | Type                                          | Description                                             |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `profile:createProfile`   | `(accountId, handle, role?) => Promise<void>` | Creates a profile row; called by auth on register       |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>`             | Syncs role on the profile row when admin changes a role |
| `preferences:store`       | `DbUserPreferenceStore`                       | User preference key/value persistence                   |
| `social:profileStore`     | `DbProfileStore`                              | Profile store shared with the messages adapter          |

### API Routes

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

### Provided UI capabilities

The profile navbar plugin provides `ui:profileAvatarRenderer`. Modules that render profile avatars must declare this ID in `requiresCapabilities`; Cognis then loads the provider before mounting their SPA routes.

### Browser client capability

`social:profileUiClient` is contributed by a standalone profile provider before dependent pages mount and exposes `getCurrentProfile()` so browser modules obtain profile data through the owning adapter client.

## Configuration

The adapter reads `db:executor` and `db:type` from the capability store
(contributed by the database gateway) and optionally `file:gateway`
(contributed by the files gateway). No environment variables are required.
If `db:executor` is absent the adapter logs a warning and exits early without
registering routes or contributing capabilities.

## Behavior

### Overview

The Profile Adapter owns user profiles, the social graph, posts, and file
management for avatar and banner uploads. It gives each Cognis account a
public-facing identity and a place in the community graph. Removing this
adapter removes all profile, social, post, and file features from the
platform without affecting core, auth, or any other component.

The adapter is self-contained: it registers its own API routes, serves the
profile HTML page, contributes capabilities to the store, and owns its
database schema. Core has no knowledge of profiles, follows, blocks, or posts.

### Responsibilities

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

### Key source locations

| Path                                                        | Purpose                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/adapters/social/profile/index.ts`                      | Adapter bootstrap entry point                                          |
| `src/adapters/social/profile/routes/social.ts`              | Follow, unfollow, block, unblock, follower/following routes            |
| `src/adapters/social/profile/routes/posts.ts`               | Post creation, listing, and deletion                                   |
| `src/adapters/social/profile/routes/profile-file-client.ts` | File upload, download, and admin size-limit management                 |
| `src/adapters/social/profile/routes/preferences.ts`         | User preference get/set                                                |
| `src/adapters/social/profile/store.ts`                      | `DbProfileStore` — all profile, social graph, and post SQL             |
| `src/adapters/social/profile/preference-store.ts`           | `DbUserPreferenceStore`                                                |
| `src/adapters/social/profile/store.ts`                      | Abstract `ProfileStore` interface and `VolatileProfileStore` for tests |
| `src/adapters/social/profile/routes/index.ts`               | Own profile and public profile route handlers                          |

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

### Live profile updates

Saved profile details are shown immediately. Follower and following totals and their user cards refresh automatically. Profile image selectors accept one active selection or upload at a time.

Follow changes and banner-height selections repaint immediately while their background synchronization completes.

Profile messaging feedback is loaded from profile-owned language resources, so profile rendering does not depend on the Messages adapter being enabled.

### Availability

The profile menu shows the current availability and lets the signed-in user choose Free, Busy, or Tentative. Avatar status lights expose the resolved status as a hover tooltip. Other components can query a user's calendar-aware resolved status by account ID through the `social:getUserAvailability` ctx capability.

### External Visibility

`profile:applyExternalProfile` accepts `profileVisibility` values of `hidden`, `private`, `friends`, or `community`. A valid value becomes the persisted profile visibility after profile creation or synchronization; unknown values are ignored.

### Unknown availability without lookup errors

GET availability returns a successful unknown status for a missing or privacy-restricted profile. Both cases have the same response shape and never query its manual preference or calendar status. Existing owner, block, community, friend and private visibility rules remain enforced; writes still require the owner. Avatar indicators display unknown without repeated not-found errors.

### Offline Social Changes

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.

### Profile Startup

Profile availability starts from the provider mount after its buffered client has been registered and avatar styles are ready. Importing the provider does not start presence callbacks or polling. Disable and failed mounts remove subscriptions, page listeners, timers and cached availability; stale asynchronous work cannot update a later provider scope. This prevents online administration pages from raising `profile_client_unavailable` during initialization.

### Public Handles

Public SSO profile handles omit provider namespaces. Existing provider-prefixed public handles are replaced at profile initialization, and collisions receive a random suffix. Existing provider-neutral handles remain stable. Account IDs, identity mappings, posts and relationships are unchanged. Public profile URLs change when their handles change. Provider metadata and email/login details remain in the administrator-only Users interface, whose per-account disclosures use the shared collapsible section styles and fetch authorized metadata when opened.

### Sudden connection loss

Transient presence and availability polling stops when Offline Mode begins and resumes after recovery. Manual availability changes retain their existing offline-buffer behavior.

### Durable Queued Results

Queued profile text, posts and bounded image uploads retain their completed result if a view refresh fails. Profile text updates use the returned server data online and an explicit queued projection offline. Failed delivery still retains drafts; a failed follow-up refresh does not invite a duplicate submission.

### Enrolled Offline Workspace

Offline Profile access requires the complete prepared own-profile snapshot: text, posts, connections, preferences and bounded avatar/banner images. Other users’ profiles are blocked even if cached.

### Profile Editing and Roles

Profile edit forms use the owning component’s display-name, bio, location and website limits. Account role synchronization resolves a profile’s public handle from its immutable account ID before updating role and visibility.

`profile:setRole(accountId, role)` → `Promise<void>`.

### Readable Mobile Content

On phones and tablets, profile identity, post composition and the post timeline come before secondary social sections. Long names, biographies and posts wrap within the available width. The full-banner presentation keeps identity below the image; existing fields and drafts survive resizing.

Preview shows the current title and body before publishing. Return to Compose or rotate the device without losing your draft.

Published posts appear immediately, and deletions update the timeline without reloading.

### Typed Storage and Routes

Profile roles and visibility types match the stored records, including moderator accounts and private, friends and community visibility. Preference reads expose the stored JSON text. Persistence tests use a profile-owned structured database fixture with rollback support.

### Credential Scope

Shared behavior: [Auth](/docs/gateways/auth/technical).

### Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's profile, social activity and preferences. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

### Retry Profile Edits

Edit Profile keeps the exact entered fields open until the server acknowledges the save or the account-bound offline buffer durably accepts it. A rejected request, unreadable response or failed buffer write shows an error and restores Save without discarding the draft. Repeated Save clicks and Enter submit only one pending request; fields are temporarily disabled while it runs. Optional card, navbar or local display-name refresh errors do not turn an accepted save into a failed write.

Discard, Close, Escape and the backdrop use the shared unsaved-change confirmation. Cancel in the confirmation retains the form. Confirming Discard closes it and ignores late callbacks; closing cannot undo a request already sent, and an informational toast says so. A save result waits for an open discard decision before updating the page. Navigation, a new mount, account/session changes and popup disposal invalidate old editor callbacks. Reopening uses the last accepted profile, with unique field/label identifiers even while the previous popup animates closed. Unsubmitted drafts are not persisted across navigation or reload.

The Profile-owned editor uses the existing `social:profile:request` ctx flow and preserves its field-validation gate, shared popup focus ownership and offline delivery policy. Synthetic DOM tests exercise the real page mount, popup, form builder and registered request flows with controlled transport and storage. They do not establish live browser layout or server/database behavior.

On your own profile, Edit Profile opens your details. Unsuccessful saves keep your changes available to correct and retry.

## Security

### Account privacy and keyring isolation

See the [shared contract](/docs/gateways/auth/technical) for this behavior.

## Reference

### Acknowledged Preference Snapshots

See the [shared contract](/docs/api/technical) for this behavior.

### Technical Specification

| Page / surface      | Guide              | Access         |
| ------------------- | ------------------ | -------------- |
| `^/profile(?:/\|$)` | Profiles And Posts | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.

Identity, posts and account actions target the rendered profile regions, including an empty posts section. The page signal owns the guide lifetime.

Posts use a distinct list target even when the composer is present. Social actions fit their buttons; composer-only preview is omitted on other profiles.

Identity and social actions precede the consecutive posts and preview stages.

The guide follows identity, social actions, posts and preview in that order. Device layout and publishing behavior are covered in [Profile](/docs/adapters/social/profile).
