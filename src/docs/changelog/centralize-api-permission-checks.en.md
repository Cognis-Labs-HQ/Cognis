# PR Changelog — Centralize API Permission Checks

## Summary

Fixed a bug where the `owner` role was denied access to user-scoped API
endpoints because route handlers used exact `role === "admin"` string matches
instead of a rank-based comparison. Since `owner` ranks above `admin` in the
role hierarchy, owners were incorrectly returning 403 on endpoints such as
`GET /api/v1/users/:id/emails` and `GET /api/v1/users/:id/notification-prefs`.

Introduced two reusable helpers in `src/gateways/auth/guard.ts`:

- `hasMinRole(role, minRole)` — returns true when the given role meets or
  exceeds the minimum required rank, using the canonical hierarchy
  `user < teacher < moderator < admin < owner`.
- `canAccessUserData(claims, targetUsername)` — returns true when the caller
  is the target user themselves, or holds at least admin rank.

Both helpers are re-exported from `src/gateways/shared.ts` for gateway authors.
All route handlers that previously performed ad-hoc string comparisons against
`"admin"` or `"owner"` now use these helpers, making permission logic
consistent and easier to audit across the codebase.

## Changed components and files

- Auth guard (new helpers):
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Notify gateway routes (owner access fix):
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
- User routes (consistency update):
    - `src/api/routes/users/index.ts`
- Profile adapter routes (owner access fix + consistency):
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/posts.ts`
- Tests (new coverage for owner access):
    - `src/gateways/notify/tests/email-routes.test.ts`
    - `src/gateways/notify/routes/tests/notification-routes.test.ts`
