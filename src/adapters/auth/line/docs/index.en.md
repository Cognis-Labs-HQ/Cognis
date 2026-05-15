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
- Registration-gateway fallback when public registration is disabled: submit a
  pending registration request for admin approval before first account use.

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

## LINE Console setup (channel + callback URL)

1. Create a **LINE Login** channel and link it to your provider in the LINE
   Developers Console.
2. Open the **LINE Login** settings page for that channel and enable
   **Use LINE Login in your web app**.
3. Set **Callback URL** to the Cognis redirect endpoint you will use for this
   environment (production/staging/local), then save.
4. Copy the channel values into Cognis:
   - `channelId` = LINE **Channel ID**
   - `channelSecret` = LINE **Channel secret** (optional if your flow is PKCE-only)
   - `redirectUri` = the exact same URL used in LINE **Callback URL**

## About `redirectUri` (is it generic?)

`redirectUri` is not fetched from LINE and it is not a global generic value.
It is your own app callback URL in Cognis. You define it, host it, and use the
exact same URL in both places:

- LINE Console: **Callback URL**
- Cognis adapter config: `redirectUri`

If the two values differ (including path, trailing slash, or protocol), LINE
authorization-code exchange will fail.

## User disclosure flow for LINE email scope

Before users continue with LINE sign-in, Cognis shows a warning popup that
explains email disclosure to satisfy LINE requirements.

## Mobile implementation notes

For mobile web/native flows, follow LINE's official authorization-code + PKCE
procedure and pass `authorizationCode` (and `codeVerifier` when PKCE is used)
to `/api/v1/auth/login` with `provider: "line"`.

References:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/docs/line-login/getting-started/#channel-and-provider-linkage
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
