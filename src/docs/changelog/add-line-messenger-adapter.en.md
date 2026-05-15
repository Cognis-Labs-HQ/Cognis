# PR Changelog — Add LINE Messenger Adapter

## Summary

Added a new `line` authentication adapter for the auth gateway.

Implemented LINE Login authorization-code support with PKCE-compatible handling
for mobile users (including LINE app handoff flows), profile retrieval, and
ID-token verification support.

Added external identity lifecycle synchronization in auth login:
account creation on first external login, live display-name/profile-image sync,
and lifecycle-state enforcement (`active`, `unlinked`, `deactivated`,
`deleted`).

Added a user route to unlink provider identities:
`POST /api/v1/auth/providers/:provider/unlink`, which marks the identity as
unlinked, disables the account, and revokes tokens.

## Changed files/components

- Authentication gateway:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
- New LINE auth adapter:
    - `src/adapters/auth/line/index.ts`
    - `src/adapters/auth/line/tests/line-adapter.test.ts`
    - `src/adapters/auth/line/package.json`
    - `src/adapters/auth/line/manifest.json`
    - `src/adapters/auth/line/tsconfig.json`
    - `src/adapters/auth/line/docs/index.en.md`
    - `src/adapters/auth/line/docs/index.de.md`
    - `src/adapters/auth/line/docs/index.id.md`
    - `src/adapters/auth/line/docs/index.ja.md`
- Version index updates:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commits

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
