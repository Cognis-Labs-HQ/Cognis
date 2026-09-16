# Module Dependency Toasts

**Feature Branch:** feature-handle-dependency-error-for-module-installation

## Clear dependency errors

Module installation and enablement now surface disabled or unavailable required dependencies as a localized error toast. Internal dependency details remain confined to server logs.

## Styled provider buttons

Authentication providers can register a removable, branded login button with a required same-origin icon and full localized label. Cognis validates the presentation contract, omits unstyled SSO methods, and keeps the icon and full-width label visible on small and large screens. Authentication footer links now remain together on one content-width row.

## SSO authorization flow

Branded provider buttons now start the canonical `startSsoLogin` flow instead of submitting the username and password form. Provider hooks validate the provider and return a safe relative or HTTPS authorization redirect, while failures are logged and shown as a localized toast.

## Token-gated account creation

External authentication now passes through the mandatory `gateAccountCreation` flow before Cognis persists a new account. Open registration authorizes creation directly; closed registration requires a single-use token matching the provider email and reports when the SSO UI must request a missing email. The unified Registration Token adapter now owns invitation and SSO authorization tokens, depends on SMTP delivery, cannot be disabled, and supplies the Users invitation action for administrators and founders.

## Reliable anonymous SSO errors

Login-method and SSO-start failures on the anonymous login page no longer call the authenticated server-log endpoint. The original localized login error remains visible without creating a second HTTP 401 request or an unhandled logging rejection.

## Composable SSO start hooks

SSO redirect resolution now ignores flow hooks that intentionally return no result. An unrelated `initiateAuthorization` participant can therefore observe or decline an SSO request without crashing redirect selection before the selected provider returns its authorization URL.

## Transaction-safe registration authorization

Closed-registration SSO now validates invitations before account creation, then consumes the token and records its canonical verified email only after account persistence succeeds; a failed commit removes the new account and restores token usability. Malformed tokens produce a normal denied gate result. Replacement invitations preserve the prior usable token until the new email is delivered, and login-button presentation augments rather than overwrites existing provider behavior.

## Guarded authentication-provider callbacks

Authentication adapters can now register removable `GET` and `POST` routes within a validated provider namespace under `/api/v1/auth`. Core Authentication namespaces remain reserved, so external modules still cannot claim protected routes directly while provider-owned OAuth callbacks such as `/api/v1/auth/x/callback` can be safely proxied through the registered adapter.

## Commits

- [82b2e35e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82b2e35e792e91be2924edc0ffa45d3d2c8a1c0d)
- [d6a4f6b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6a4f6b5d0c4ae212927fd18912345ba749f837f)
- [4eb78e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb78e4433e7371533c1cd9d26bdca0e82f006f9)
- [5bd254bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bd254bb88a817bfe40e86eb32d25d53661ce5eb)
- [83ca6396](https://github.com/Cognis-Labs-HQ/Cognis/commit/83ca639667ff46fb7a66afeaa69b4145383a9da9)
- [88985bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/88985bd515cdbc7539c2326812879e67a39a1143)
- [4120a69d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4120a69d267eaf07897bed979032b2e7706e1a7c)
- [a4c928d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a4c928d82c7c42ee4a9ec4f295199d008abc9137)
- [fa24bfec](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa24bfec261a358e17e6bbb9078b160a1b4cb903)
- [e66d75f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e66d75f72b2e8ab4da4a4e93435f6472b4fe3903)
- [85b7f238](https://github.com/Cognis-Labs-HQ/Cognis/commit/85b7f238bd959f9c4230168ff1378eebc04bbcee)
