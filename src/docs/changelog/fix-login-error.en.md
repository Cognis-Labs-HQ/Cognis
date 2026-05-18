# Fix Broken Login Requests

## Summary

Login requests were failing with a generic `400 Request failed` response when
the social profile adapter was not installed or its `account_profiles` table was
unavailable. The local auth adapter's DB store was joining that table during
credential verification and account listing even though authentication should
depend only on auth-owned account data.

This change removes the cross-adapter profile-table dependency from the local
auth store so login succeeds with only the auth tables present. It also adds a
regression test that fails if auth lookups try to join `account_profiles`.

## Changed Files / Components

- `src/adapters/auth/local/store.ts` — removed `account_profiles` joins from
  local credential verification and account listing
- `src/adapters/auth/local/tests/store.test.ts` — added regression coverage for
  DB-backed auth without the social profile table
- `src/adapters/auth/local/package.json` — bumped Local Auth adapter version to
  `0.2.3`
- `src/docs/versions.en.md` — updated the Local Auth adapter version index entry

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/9ecb747f64a13830eb0d108fcd11d6bd5c0aa838
