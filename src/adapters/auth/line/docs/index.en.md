# LINE Messenger SSO Adapter

## Overview

This adapter enables LINE Login for Cognis authentication.

It supports the authorization-code flow with PKCE so mobile users who have the
LINE app installed can complete sign-in through LINE app handoff and return to
the configured redirect URI.

## Supported lifecycle

- Initial account creation from LINE identity on first successful login.
- Live sync of profile display name and profile image URL metadata on login.
- Lifecycle-state propagation for `active`, `unlinked`, `deactivated`, and
  `deleted` identities.

## Required configuration

- `channelId`
- `redirectUri`

Optional:

- `channelSecret`
- `usePkce`
- `accountIdPrefix`
- `tokenEndpoint`
- `profileEndpoint`
- `verifyIdTokenEndpoint`

## Mobile implementation notes

For mobile web/native flows, follow LINE's official authorization-code + PKCE
procedure and pass `authorizationCode` (and `codeVerifier` when PKCE is used)
to `/api/v1/auth/login` with `provider: "line"`.

References:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
