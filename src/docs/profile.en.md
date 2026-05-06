# Profile

## Overview

The profile feature gives each account a public-facing identity, a social graph, a microblog-style post stream, and file upload capabilities. It is implemented as the profile gateway (`src/gateways/profile/`) and a corresponding UI page (`src/ui/app/profile/`). The backend routes, data stores, and page-serving logic are all owned by the gateway so that removing the gateway removes the profile feature entirely without leaving dead code in core.

Visibility is a first-class concern. Each account chooses a visibility tier that gates who can see their profile, social counts, and posts. Post-level visibility adds a second layer of control on top of the account tier. Blocked accounts receive 404 responses on any endpoint that targets the blocker, ensuring that blocking is opaque to the blocked party.

The profile page uses `createPageComposer` for a customisable grid layout. Users can reorder and resize the hero card, follower/following counts, post stream, and social link panels. Layout preferences are persisted per-user via the preferences API.

## Responsibilities

- Own the `account_profiles`, `account_follows`, `account_blocks`, `posts`, and `file_size_limits` database tables.
- Enforce account-level and post-level visibility on all profile and content endpoints.
- Manage avatar and banner uploads through the file gateway.
- Maintain the social graph: follow, unfollow, block, unblock, follower and following lists.
- Serve the profile HTML page and redirect `/profile` to `/profile/:handle`.
- Contribute `profile:createProfile` and `profile:setRoleByHandle` capabilities to the store so auth and user routes can keep profile rows in sync.
- Contribute `preferences:store` to the capability store.

Not responsible for: file storage implementation (that is the files gateway), authentication, or any other gateway's data.

## Architecture

### Database tables

| Table | Purpose |
| ----- | ------- |
| `account_profiles` | Core profile data: handle, role, bio, location, website, avatar_key, banner_key, visibility |
| `account_follows` | Follower → following pairs |
| `account_blocks` | Blocker → blocked pairs |
| `posts` | User-authored posts with per-post visibility |
| `file_size_limits` | Per-category upload size caps (`image`, `video`, `text`, `global`) |

Schema SQL is in `src/adapters/db/{sqlite,mariadb,postgres}/sql/init/002_profile.sql`.

### Key source locations

| Path | Purpose |
| ---- | ------- |
| `src/gateways/profile/bootstrap.ts` | Gateway bootstrap; wires stores, routes, and capabilities |
| `src/gateways/profile/routes/social.ts` | Follow, unfollow, block, unblock, follower/following list routes |
| `src/gateways/profile/routes/posts.ts` | Post creation, listing, and deletion routes |
| `src/gateways/profile/routes/files.ts` | File upload, download, and admin size-limit routes |
| `src/gateways/profile/routes/preferences.ts` | User preference get/set routes |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — all profile SQL operations |
| `src/adapters/db/reuse/preference-store.ts` | `DbUserPreferenceStore` |
| `src/api/routes/profile/index.ts` | Own profile and public profile route handlers |
| `src/ui/app/profile/index.js` | Profile page entry point |

### Visibility model

| Tier | Profile visible to | Posts and counts visible to |
| ---- | ------------------ | ---------------------------- |
| `hidden` (default) | Self and admin only | — (posting blocked; returns 403) |
| `private` | Existing followers only | Followers only |
| `friends` | Any authenticated user | Followers only |
| `community` | Any authenticated user | Any authenticated user |

Post visibility (`only_me | private | friends | community`) is always capped by the account tier. Blocked callers receive 404 on any endpoint targeting the blocker.

### Capabilities contributed

| Capability | Type | Description |
| ---------- | ---- | ----------- |
| `profile:createProfile` | `(accountId, handle, role?) => Promise<void>` | Creates a profile row; called by auth on register |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>` | Syncs role on profile row; called by user:role route |
| `preferences:store` | `DbUserPreferenceStore` | User preference persistence |

### Frontend page structure

The profile page (`src/ui/app/profile/index.js`) uses `createPageComposer` with grid customisation enabled. Ownership is detected by comparing the URL handle with the `cognis_account` value in `localStorage`.

| Element | Default visible | Grid size |
| ------- | --------------- | --------- |
| `hero` | Yes | full |
| `followers` | Yes | `[2, 3]` (min `[2, 1]`, max full) |
| `following` | Yes | `[2, 3]` (min `[2, 1]`, max full) |
| `posts` | Yes | full |
| `social-links` | No | `[2, 3]` (min `[2, 1]`, max full) |
| `suggested` | No | `[2, 3]` (min `[2, 1]`, max full) |

## Configuration

The profile gateway has no direct environment variable configuration. It reads `db:executor`, `db:type`, and `file:gateway` from the capability store, all contributed by the db and files gateways.

## API Routes

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/api/v1/profile/ping` | Capability check | Bearer |
| `GET` | `/api/v1/profile` | Own profile | Bearer |
| `PATCH` | `/api/v1/profile` | Update own profile | Bearer |
| `PUT` | `/api/v1/profile/avatar` | Upload avatar (JPEG/PNG/WebP) | Bearer |
| `DELETE` | `/api/v1/profile/avatar` | Remove own avatar | Bearer |
| `PUT` | `/api/v1/profile/banner` | Upload banner (JPEG/PNG/WebP/GIF) | Bearer |
| `DELETE` | `/api/v1/profile/banner` | Remove own banner | Bearer |
| `GET` | `/api/v1/users/:handle/profile` | Public profile (gated by visibility) | Bearer |
| `POST` | `/api/v1/users/:handle/follow` | Follow a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/follow` | Unfollow | Bearer |
| `POST` | `/api/v1/users/:handle/block` | Block a user | Bearer |
| `DELETE` | `/api/v1/users/:handle/block` | Unblock | Bearer |
| `GET` | `/api/v1/users/:handle/followers` | Follower list | Bearer |
| `GET` | `/api/v1/users/:handle/following` | Following list | Bearer |
| `POST` | `/api/v1/posts` | Create post | Bearer |
| `GET` | `/api/v1/posts` | List own posts | Bearer |
| `DELETE` | `/api/v1/posts/:id` | Delete post (owner, moderator, admin) | Bearer |
| `GET` | `/api/v1/users/:handle/posts` | List user's posts | Bearer |
| `PUT` | `/api/v1/files/:bucket/:key` | Upload file | Bearer |
| `GET` | `/api/v1/files/:bucket/:key` | Download file | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key` | Delete file | Admin |
| `GET` | `/api/v1/admin/file-limits` | List size limits | Admin |
| `PUT` | `/api/v1/admin/file-limits/:category` | Set size limit | Admin |
