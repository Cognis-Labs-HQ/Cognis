# Registration tokens and SSO integration

**Feature Branch:** registration-token-sso-review

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

## Explicit privileged modules

Modules must declare `privileged: true` before extending security-sensitive authentication flows or proxying gateway-owned routes through an auth adapter. Claiming to be an SSO provider alone grants no additional access. Cognis trusts privileged provenance from the hardcoded `Cognis-Labs-HQ` GitHub organization and emits an explicit warning whenever another source requests privilege.

## Protected module ownership and assurance

Module API routes, capabilities, flows, hooks, static prefixes, and UI registrations now reject cross-owner replacement and are cleaned up only for their recorded owner. Cross-module consumers can request an assurance descriptor containing immutable identity, version, privilege provenance, source, and runtime integrity. Installer provenance seals the manifest hash and Cognis re-hashes every declared file so integrations can refuse tampered or unverifiable providers.

## Module isolation compliance

Unprivileged modules can now register API routes, capabilities, and new flows only inside their own module namespace. Host and foreign namespaces require an explicit privileged declaration, preventing ordinary extensions from squatting on another module's integration surface. The compliance pass also corrected localized login diagnostics and Registration Token documentation structure.

## Review hardening and cooperative integrations

Concurrent SSO callbacks now share one token-consumption result so a losing callback cannot delete the winning account. Registration Tokens depend on the neutral Notification gateway rather than SMTP, branded buttons remain limited to enabled providers, and dependency-dialog failures use localized guidance. Unprivileged modules retain a documented and tested cooperation path through provider-owned namespaced capabilities and non-sensitive flows.

## Mandatory component lifecycle recovery

Token redemption coalescing now includes both token and account identity, preventing a competing external account from inheriting another callback's authorization. A reusable Core lifecycle policy forces mandatory locked components active despite obsolete persisted disablement; Authentication, Registration, and always-on Notification providers apply it at load and configuration boundaries.

## Runtime auth lifecycle parity

Module-provided authentication adapters now restore their gateway-owned persisted configuration and enabled state before provider registration completes. The registration capability is asynchronous so modules can await lifecycle readiness before contributing callback routes or branded login buttons, matching the discovery and activation order used by LDAP. Documentation specifies the X SSO migration path and gateway-owned setup contract.

## Token-gated SSO registration continuation

When an authenticated SSO identity needs a Cognis account while public registration is disabled, the login response now explicitly requests a registration token and supplies the retry endpoint. Cognis preserves the submitted token and fallback email through provider re-authentication so the mandatory Registration Token adapter can authorize account creation.

## Registration-owned SSO authorization and invitation policies

Unknown SSO identities now move to an opaque, expiring registration attempt rendered by the Registration Token adapter inside the standard Cognis registration shell. The Users invite popup provides Email and Token tabs, manual tokens work without SMTP, founder registrations are capped at ten successful uses with an administrator reset, and owners control founder and administrator invitation rights from Administration → Registration. Public registration explicitly bypasses token authorization.

## Users page build correction

The founder invitation reset action now remains inside the Users page action handler, restoring valid ECMAScript module output for production UI builds.

## Focused change scope

The unrelated module dependency-toast changes were removed from this pull request. The remaining implementation is limited to registration-token consolidation, SSO/provider lifecycle integration, and the module boundary protections required by those extension points.

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
- [5552b77f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5552b77f945050d4e9b51e43a90c79a95d348487)
- [23517721](https://github.com/Cognis-Labs-HQ/Cognis/commit/2351772152b0d07f6c82a9683222d0d0cf6602d0)
- [d62eba99](https://github.com/Cognis-Labs-HQ/Cognis/commit/d62eba99)
- [6eec5296](https://github.com/Cognis-Labs-HQ/Cognis/commit/6eec52967246d4e0991b56691c6024cdc71c2c1e)
- [3cf4aee2](https://github.com/Cognis-Labs-HQ/Cognis/commit/3cf4aee2a35c83065d116717f71a845f36bf5416)
- [fcfbfc35](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcfbfc35a6bd698b4be409764e07bf8820f3201b)
- [2f42af60](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f42af6007a0935a99ca2860cfb893c8e9bc3c2d)
- [fb4cbefe](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb4cbefe2974a810fe5a8dabc15267d7663a58a4)
- [a7f57fd8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7f57fd8e8d21b3783b9e316ade117343c4e5cbd)
- [06f9f746](https://github.com/Cognis-Labs-HQ/Cognis/commit/06f9f746c0b33eaab8eb3c7af57a6c9b754f4164)
