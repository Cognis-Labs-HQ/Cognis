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

Added a new `requests` adapter to the Registration gateway for manual approval
workflows. When public registration is disabled or unavailable, first-time
external SSO login (including LINE) now creates a pending registration request
instead of immediately creating an account.

Registration admins can review requests under Administration → Registration via
new registration-request APIs and approve/reject actions.

Login now maps pending/rejected/unavailable registration request outcomes to
localized toast messages.

The Authentication gateway now lets auth adapters expose Cognis-managed callback
routes. The LINE adapter registers `/auth/line/callback`, exposes that managed
path through the admin config API, and the Authentication admin popup now shows
the generated callback URL and pre-fills `redirectUri` when no saved value is
present.

## Changed files/components

- Authentication gateway:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
    - `src/gateways/auth/ui/admin-section.js`
    - `src/gateways/auth/ui/languages/en/strings.xml`
    - `src/gateways/auth/ui/languages/de/strings.xml`
    - `src/gateways/auth/ui/languages/id/strings.xml`
    - `src/gateways/auth/ui/languages/ja/strings.xml`
    - `src/gateways/auth/tests/auth-gateway.test.ts`
    - `src/gateways/auth/tests/admin-section.test.js`
    - `src/gateways/auth/docs/index.en.md`
    - `src/gateways/auth/docs/index.de.md`
    - `src/gateways/auth/docs/index.id.md`
    - `src/gateways/auth/docs/index.ja.md`
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
- New Registration requests adapter:
    - `src/adapters/registration/requests/index.ts`
    - `src/adapters/registration/requests/package.json`
    - `src/adapters/registration/requests/manifest.json`
    - `src/adapters/registration/requests/tests/requests-adapter.test.ts`
- Registration gateway:
    - `src/gateways/registration/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/registration/manifest.json`
    - `src/gateways/registration/ui/admin-section.js`
    - `src/gateways/registration/ui/languages/en/strings.xml`
    - `src/gateways/registration/ui/languages/de/strings.xml`
    - `src/gateways/registration/ui/languages/id/strings.xml`
    - `src/gateways/registration/ui/languages/ja/strings.xml`
- Login UI + i18n:
    - `src/ui/app/login/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Version index updates:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commits

- [0ad1215](https://github.com/le-firehawk/Cognis/commit/0ad1215)
- [dcc34fc](https://github.com/le-firehawk/Cognis/commit/dcc34fc)
- [562d0ed](https://github.com/le-firehawk/Cognis/commit/562d0ed)

---

## LINE OAuth Flow and Redirect URI Management (follow-up)

### Summary

The LINE adapter now manages the OAuth redirect URI entirely via its built-in callback route. The `redirectUri` configuration field has been removed from the adapter schema — admins no longer need to paste the URL into the config form; the callback URL is displayed read-only in the admin popup as before.

The callback route at `/auth/line/callback` now serves a self-contained HTML handoff page when LINE redirects back with an authorization code. The page validates the PKCE state, exchanges the authorization code for a session, stores credentials in `localStorage`, and redirects to `/dashboard`. On failure it redirects to `/login` with an appropriate reason code.

A new `/api/v1/auth/line/init` API endpoint exposes the channel ID, PKCE settings, authorization endpoint URL, and scope so the login and register pages can initiate the OAuth redirect without hardcoding LINE-specific constants.

Both the login and register pages now include a "Login with LINE" button via the SSO provider system. Clicking it shows the LINE data disclosure popup; on confirmation it performs PKCE setup (`generateRandomString`, `generateCodeChallenge` from the new `oauth-pkce.js` reuse module) and redirects to LINE's authorization page.

A new `src/ui/reuse/oauth-pkce.js` module provides generic, reusable PKCE helpers (`generateRandomString`, `generateCodeChallenge`, `buildAuthorizationUrl`) consumed by both auth pages.

### Changed Files / Components

- `src/adapters/auth/line/index.ts` — removed `redirectUri` from config schema; relaxed `authenticate()` guard; added `/api/v1/auth/line/init` route; callback serves HTML handoff page when `?code=` is present
- `src/adapters/auth/line/package.json` — bumped to 0.4.0
- `src/gateways/auth/ui/admin-section.js` — removed dead `redirectUri` auto-prefill block
- `src/gateways/auth/tests/admin-section.test.js` — updated to match removed prefill
- `src/ui/reuse/oauth-pkce.js` — new PKCE helpers module
- `src/ui/app/login/index.js` — LINE button now initiates OAuth redirect; added LINE error reason codes
- `src/ui/app/register/index.js` — added SSO buttons section with LINE support
- `src/ui/languages/{en,de,ja,id}/strings.xml` — added LINE error and reason code strings
- `src/adapters/auth/line/tests/line-adapter.test.ts` — updated schema tests; added init route and HTML callback tests
- `src/docs/versions.en.md` — bumped LINE adapter to 0.4.0
