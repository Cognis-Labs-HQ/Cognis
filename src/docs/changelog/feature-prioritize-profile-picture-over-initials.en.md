# Prefer Profile Avatars in...

## Summary

Avatar rendering in the Messages adapter now prefers actual profile images over
initials. A new shared module in the social gateway centralises authenticated
avatar fetching and initials fallback so the logic is reusable across all social
adapter UI surfaces.

## Changed Files / Components

- **`src/gateways/social/ui/reuse/profile-avatar.js`** _(new)_ — shared module
  exporting `fetchProfileAvatarBlobUrl`, `isProfileAvatarUnavailable`,
  `buildProfileAvatarMarkup`, `hydrateProfileAvatars`, and
  `handleProfileAvatarError`.
- **`src/adapters/social/messages/ui/app.js`** — removed duplicate avatar
  utilities; all avatar rendering now delegates to the shared gateway module.
- **`src/adapters/social/messages/routes.ts`** — `enrichMembersWithProfiles`
  now includes `avatarKey` in the enriched member shape.
- **`src/adapters/social/profile/ui/navbar.js`** — dashboard navbar avatar
  provider uses `fetchProfileAvatarBlobUrl` from the shared module.
- **`src/adapters/social/messages/tests/bootstrap.test.ts`** — updated avatar
  fallback regression assertions to check the new shared module location.
- **`src/adapters/social/messages/tests/routes.test.ts`** — added assertion
  that `GET /messages/rooms` returns member `avatarKey` values.

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/9f78b06
- https://github.com/le-firehawk/Cognis/commit/5399b86
