# Profile — UI and Backend

## Overview

The profile feature gives each account a public-facing page showing identity, social counts, posts, and configuration controls. It covers:

- Profile data management (bio, location, website, visibility, avatar, banner)
- Social graph (followers, following, blocks, follow requests)
- Post creation and display with per-post visibility
- A customisable page layout via the page-composer grid

---

## Backend

### Database tables

| Table | Purpose |
|---|---|
| `account_profiles` | Core profile data: handle, role, bio, location, website, avatar\_key, banner\_key, visibility |
| `account_follows` | Follower → following pairs |
| `account_blocks` | Blocker → blocked pairs |
| `posts` | User-authored posts with per-post visibility |
| `file_size_limits` | Per-category upload size caps (`image`, `video`, `text`, `global`) |

Schema initialisation SQL is in `db/init/{mariadb,postgresql,sqlite}/002_profile.sql`.

### Visibility model

Account-level visibility gates all profile API responses:

| Tier | Visible to | Posts/counts visible to |
|---|---|---|
| `hidden` (default) | Self and admin only | — (posting blocked; 403 returned) |
| `private` | Existing followers only | Followers only |
| `friends` | Any authenticated user | Followers only |
| `community` | Any authenticated user | Any authenticated user |

Blocked callers receive `404` on any endpoint that targets the blocker.

Post visibility (`only_me | private | friends | community`) is always capped by account tier.

### API routes

All profile/social/post routes require a valid bearer token unless noted.

**Own profile**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/profile` | Own profile data (handle, bio, location, website, visibility, avatar/banner keys, follower/following/post counts) |
| `PATCH` | `/api/v1/profile` | Update bio, location, website, or visibility |
| `PUT` | `/api/v1/profile/avatar` | Upload avatar (JPEG/PNG/WebP; capped by `image` size limit) |
| `DELETE` | `/api/v1/profile/avatar` | Remove own avatar |
| `PUT` | `/api/v1/profile/banner` | Upload banner (JPEG/PNG/WebP/GIF; capped by `image` size limit) |
| `DELETE` | `/api/v1/profile/banner` | Remove own banner |

**Other users' profiles**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/users/:handle/profile` | Public profile; gated by account visibility and block state |

**Social graph**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/users/:handle/follow` | Follow a user (blocked callers and `hidden` targets return 404) |
| `DELETE` | `/api/v1/users/:handle/follow` | Unfollow |
| `POST` | `/api/v1/users/:handle/block` | Block a user; mutual follows are removed |
| `DELETE` | `/api/v1/users/:handle/block` | Unblock |
| `GET` | `/api/v1/users/:handle/followers` | Follower list (gated by visibility; `friends` tier hides list to non-followers) |
| `GET` | `/api/v1/users/:handle/following` | Following list (same gating as followers) |

**Posts**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/posts` | Create post; `hidden` accounts get 403; visibility: `only_me \| private \| friends \| community` |
| `GET` | `/api/v1/posts` | List own posts |
| `DELETE` | `/api/v1/posts/:id` | Delete post; owner, moderator, or admin only |
| `GET` | `/api/v1/users/:handle/posts` | List a user's posts; filtered by account and post visibility; blocks return 404 |

**Files and size limits**

| Method | Path | Description |
|---|---|---|
| `PUT` | `/api/v1/files/:bucket/:key` | Upload; enforced against per-category size limit |
| `GET` | `/api/v1/files/:bucket/:key` | Download |
| `DELETE` | `/api/v1/files/:bucket/:key` | Delete; admin only |
| `GET` | `/api/v1/admin/file-limits` | List size limits (admin) |
| `PUT` | `/api/v1/admin/file-limits/:category` | Set a size limit (admin); body: `{ "maxBytes": <positive integer> }` |

### File storage

Avatar and banner uploads are stored through `FileStorageGateway`. The local adapter (`LocalFileGateway`) writes files to `$MEDIA_LOCATION/uploads/{userId}/{uuid}.{ext}`. See `src/docs/components/adapters.md` for the full gateway interface.

---

## Frontend

### Routes

| Path | Behaviour |
|---|---|
| `/profile` | Server redirects to `/profile/:handle` (own handle from JWT claims) |
| `/profile/:handle` | Serves `profile.html`; JS fetches profile data on load |
| `/user` | Legacy alias; serves profile HTML directly for authenticated users |

All three paths redirect unauthenticated visitors to `/login`.

### Page structure

The profile page (`src/ui/app/profile/index.js`) uses `createPageComposer` with grid customisation enabled. The composer elements are:

| Element | Default visible | Grid size |
|---|---|---|
| `hero` | Yes | full |
| `followers` | Yes | `[2, 3]` (min `[2, 1]`, max full) |
| `following` | Yes | `[2, 3]` (min `[2, 1]`, max full) |
| `posts` | Yes | full |
| `social-links` | No (library) | `[2, 3]` (min `[2, 1]`, max full) |
| `suggested` | No (library) | `[2, 3]` (min `[2, 1]`, max full) |

### Hero element

The hero card shows:
- Banner image (optional), with a hamburger menu (≡) to toggle half/full height or remove the banner
- Avatar with upload/remove controls (own profile only)
- Display name, handle, and visibility badge
- Bio, location, and website fields (editable inline for own profile)
- Follow and block buttons (other profiles)
- Follower, following, and post counts

Banner height preference is persisted under the user preference key `profile-banner`. Full-banner mode adds class `profile-hero--full-banner` to `.profile-hero`.

### Own profile vs. other profiles

The page detects ownership by comparing the URL handle (`window.location.pathname.split('/')[2]`) with the `cognis_account` value in `localStorage`. When `isOwnProfile` is true:
- Edit controls (upload/remove avatar, upload/remove banner, edit profile fields) are shown
- The "It's You" pill is displayed in the handle row
- Follow and block buttons are hidden

### i18n keys

All profile copy lives under `ui.app.profile.*` in the language packs at `src/ui/languages/{en,de,ja,id}/strings.xml`. The page title key is `ui.page.title.profile`.
