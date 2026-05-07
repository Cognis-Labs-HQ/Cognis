# Profile Gateway

## Overview

The Profile Gateway owns user profiles, the social graph, posts, and file management for avatar and banner uploads. It is the component that gives each Cognis account a public-facing identity and a place in the community graph. Removing this gateway removes all profile, social, post, and file features from the platform without affecting core, auth, or any other gateway.

The gateway is self-contained: it registers its own API routes, serves the profile HTML page, contributes capabilities to the store, and owns its database schema. Core has no knowledge of profiles, follows, blocks, or posts.

## Responsibilities

- Own and initialise the `account_profiles`, `account_follows`, `account_blocks`, `posts`, and `file_size_limits` database tables.
- Enforce account-level and post-level visibility on all profile and social endpoints.
- Manage the social graph: follow, unfollow, block, unblock, and follower/following list queries.
- Handle avatar and banner uploads through the `file:gateway` capability.
- Serve the `/profile` redirect and `/profile/:handle` HTML page.
- Contribute `profile:createProfile`, `profile:setRoleByHandle`, and `preferences:store` to the capability store.
- Register all profile, social, post, file, and preference routes.

Not responsible for: file storage implementation (files gateway), authentication (auth gateway), or any other gateway's data.

## Architecture

The gateway bootstrap in `src/gateways/profile/bootstrap.ts`:
1. Retrieves `db:executor` and `db:type` from capabilities.
2. Instantiates `DbProfileStore` and calls `ensureSchema()`.
3. Instantiates `DbUserPreferenceStore`, calls `ensureSchema()`, and contributes `preferences:store`.
4. Contributes `profile:createProfile` and `profile:setRoleByHandle`.
5. Retrieves `file:gateway` (optional); registers file routes only when the capability is present.
6. Registers profile, social, post, preference, and page-serving routes.
7. Registers a navbar UI plugin via `ctx.uiRegistry`.

### Key source locations

| Path | Purpose |
| ---- | ------- |
| `src/gateways/profile/bootstrap.ts` | Bootstrap entry point |
| `src/gateways/profile/routes/social.ts` | Follow, unfollow, block, unblock, follower/following routes |
| `src/gateways/profile/routes/posts.ts` | Post creation, listing, and deletion |
| `src/gateways/profile/routes/files.ts` | File upload, download, and admin size-limit management |
| `src/gateways/profile/routes/preferences.ts` | User preference get/set |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — all profile, social graph, and post SQL |
| `src/adapters/db/reuse/preference-store.ts` | `DbUserPreferenceStore` |
| `src/api/routes/profile/index.ts` | Own profile and public profile route handlers |

### Visibility model

| Tier | Profile visible to | Posts and counts visible to |
| ---- | ------------------ | ---------------------------- |
| `hidden` (default) | Self and admin only | — (posting returns 403) |
| `private` | Existing followers only | Followers only |
| `friends` | Any authenticated user | Followers only |
| `community` | Any authenticated user | Any authenticated user |

Post visibility (`only_me | private | friends | community`) is always capped by the account's tier. Blocked callers receive 404 on any endpoint targeting the blocker.

### Capabilities contributed

| Capability | Type | Description |
| ---------- | ---- | ----------- |
| `profile:createProfile` | `(accountId, handle, role?) => Promise<void>` | Creates a profile row; called by auth on register |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>` | Syncs role on the profile row when admin changes a role |
| `preferences:store` | `DbUserPreferenceStore` | User preference key/value persistence |

## Configuration

The profile gateway reads `db:executor`, `db:type`, and optionally `file:gateway` from the capability store. These are contributed by the database and files gateways respectively. No direct environment variable configuration is required.

## API Routes

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/profile/ping` | Capability check | Bearer |
| `GET` | `/api/v1/profile` | Own profile | Bearer |
| `PATCH` | `/api/v1/profile` | Update own profile fields | Bearer |
| `PUT` | `/api/v1/profile/avatar` | Upload avatar | Bearer |
| `DELETE` | `/api/v1/profile/avatar` | Remove own avatar | Bearer |
| `PUT` | `/api/v1/profile/banner` | Upload banner | Bearer |
| `DELETE` | `/api/v1/profile/banner` | Remove own banner | Bearer |
| `GET` | `/api/v1/users/:handle/profile` | Public profile | Bearer |
| `POST` | `/api/v1/users/:handle/follow` | Follow a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/follow` | Unfollow | Bearer |
| `POST` | `/api/v1/users/:handle/block` | Block a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/block` | Unblock | Bearer |
| `GET` | `/api/v1/users/:handle/followers` | Follower list | Bearer |
| `GET` | `/api/v1/users/:handle/following` | Following list | Bearer |
| `POST` | `/api/v1/posts` | Create post | Bearer |
| `GET` | `/api/v1/posts` | List own posts | Bearer |
| `DELETE` | `/api/v1/posts/:id` | Delete post | Bearer |
| `GET` | `/api/v1/users/:handle/posts` | List user's posts | Bearer |
| `PUT` | `/api/v1/files/:bucket/:key` | Upload file | Bearer |
| `GET` | `/api/v1/files/:bucket/:key` | Download file | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key` | Delete file | Admin |
| `GET` | `/api/v1/admin/file-limits` | List per-category size limits | Admin |
| `PUT` | `/api/v1/admin/file-limits/:category` | Set a size limit | Admin |
