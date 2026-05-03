# API Component

## Purpose
`api/` exposes HTTP endpoints that map explicit business intent to core services.

## Design principles
1. **Thin route handlers**: parse -> validate -> delegate -> respond.
2. **Stable response envelopes**: `{ data }` for success, `{ error }` for failure.
3. **Gateway-first integration**: route layer never speaks provider SDK directly.

## Route groups

### System
- `GET /api/v1/system/health`
- `GET /api/v1/system/healthcheck`
- `GET /api/v1/system/ui-config`

### Auth
- `POST /api/v1/auth/register` — self-register; issues `user` role by default
- `POST /api/v1/auth/login` — returns a bearer token

### Modules
- `POST /api/v1/modules/:id/enable`
- `POST /api/v1/modules/:id/disable`

### Docs
- `GET /api/v1/docs`
- `GET /api/v1/docs/:slugOrTreePath`

### Profile
Requires a valid bearer token for all endpoints.

- `GET /api/v1/profile` — own profile (handle, bio, location, website, visibility, counts)
- `PATCH /api/v1/profile` — update own profile fields (bio, location, website, visibility)
- `PUT /api/v1/profile/avatar` — upload avatar; accepted types: jpeg, png, webp; size capped by image limit
- `DELETE /api/v1/profile/avatar` — remove own avatar
- `PUT /api/v1/profile/banner` — upload banner; accepted types: jpeg, png, webp, gif; size capped by image limit
- `DELETE /api/v1/profile/banner` — remove own banner
- `GET /api/v1/users/:handle/profile` — public profile; gated by account visibility and block state

### Social graph
Requires a valid bearer token for all endpoints.

- `POST /api/v1/users/:handle/follow` — follow a user (blocked callers and hidden targets get 404)
- `DELETE /api/v1/users/:handle/follow` — unfollow
- `POST /api/v1/users/:handle/block` — block a user (removes mutual follows, caller is hidden to blockee)
- `DELETE /api/v1/users/:handle/block` — unblock
- `GET /api/v1/users/:handle/followers` — follower list (gated by visibility; `friends` tier hides list to non-followers)
- `GET /api/v1/users/:handle/following` — following list (same gating as followers)

### Posts
Requires a valid bearer token for all endpoints.

- `POST /api/v1/posts` — create a post; `hidden` users are rejected (403); visibility values: `only_me | private | friends | community`
- `GET /api/v1/posts` — list own posts
- `DELETE /api/v1/posts/:id` — delete a post; owner, moderator, or admin only
- `GET /api/v1/users/:handle/posts` — list a user's posts; filtered by account visibility and per-post visibility; blocks return 404

### Files
Requires a valid bearer token for all endpoints.

- `PUT /api/v1/files/:bucket/:key` — upload a file; size enforced against per-category limit (image / video / text / global)
- `GET /api/v1/files/:bucket/:key` — download a file
- `DELETE /api/v1/files/:bucket/:key` — delete a file; admin only

### Admin – file limits
Requires admin role.

- `GET /api/v1/admin/file-limits` — list all per-category size limits
- `PUT /api/v1/admin/file-limits/:category` — set a size limit; body: `{ "maxBytes": <positive integer> }`

## Visibility model

Account-level visibility controls API exposure of a profile and its content:

| Tier | Profile visible to | Counts/posts visible to |
|---|---|---|
| `hidden` (default) | nobody (except self/admin) | — (cannot post; attempting returns 403) |
| `private` | existing followers only | followers only |
| `friends` | anyone with an account | followers only |
| `community` | anyone with an account | anyone with an account |

Posts carry their own visibility (`only_me | private | friends | community`) which is further capped by the account tier. Blocked callers receive 404 on any endpoint targeting the blocker.

## Error response shape
```json
{
  "error": {
    "code": "forbidden",
    "message": "Requires admin scope"
  }
}
```


## API auth model
- API authorization uses **opaque bearer access tokens** only for API routes.
- Obtain a token with `POST /api/v1/auth/login`; response includes `data.token`.
- Send tokens as `Authorization: Bearer <token>`.
- Login also sets `cognis_access_token` as an HttpOnly cookie for server-rendered UI route guards.
- Token expiry is controlled by `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, 12 hours).
- API startup mints a non-expiring CLI bootstrap token at `/var/run/cognis/cli-access.token` (permission mode `0600`) for trusted local CLI usage.


## Persistence defaults
- Supported account persistence backends: `sqlite`, `postgresql`, `mariadb`.
- Default `DB_TYPE` is `sqlite`.
- If no DB connection env vars are provided, startup creates a local SQLite database at `./data/cognis.sqlite`.
- For `postgresql` and `mariadb`, `DATABASE_URL` must be provided.


## Core schema + module presence
- During startup, API initializes core persistence tables for:
  - `accounts`
  - `user_preferences`
  - `modules`
  - `account_profiles`, `account_follows`, `account_blocks`, `posts`, `file_size_limits`
- Core module presence is recorded in `modules` (seeded with `cognis-core`).
- External modules should provide their own schema migration entrypoints and register module IDs in `modules` so operational tools can detect install/enable state from the DB.

