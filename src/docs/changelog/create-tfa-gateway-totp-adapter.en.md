# TFA Gateway & TOTP

**Feature Branch:** copilot/create-tfa-gateway-totp-adapter

## Add New TFA Gateway

Added a dedicated `tfa` gateway with adapter discovery under `src/adapters/tfa/*`, user method APIs, recovery-code lifecycle APIs, and admin reset endpoints.

## Add TOTP Adapter

Added a `totp` adapter under `src/adapters/tfa/totp` with setup verification and login-code verification.

## Integrate Login and Security

Updated login and security flows for two-factor prompts, enforced setup redirects, Administration security enforcement toggles, and user-level TFA reset actions.

## TOTP Algorithm Dropdown

The TOTP adapter admin config popup now shows an HMAC Algorithm dropdown (SHA1, SHA256, SHA512) instead of exposing uneditable metadata. The selected algorithm is used when generating QR codes and verifying codes.

## TFA Methods Table Layout

The Available and Preferred Two-Factor Methods panels now use the table-based drag-and-drop layout matching Language Preferences, fixing the empty-state width issue and drop-zone rendering.

## Deferred TFA Method Changes

Dragging methods between Available and Preferred now stages changes locally; setup popups and API calls are deferred until the user saves settings.

## Recovery Codes Tooltip

A tooltip next to the Recovery Codes heading explains that recovery codes are for accessing your account when configured methods are unavailable.

## Deactivated Method Warning Toast

Moving a TFA method from Preferred to Available now shows a warning toast with the method name instead of a generic success message. The tick (✓) now only appears on methods in the Preferred table.

## Enforcement Popup Spacing Fix

Corrected spacing between the instruction text and the method dropdown in the mandatory TFA setup popup.

## Review Follow-Up Refinements

Set SHA256 as the default TOTP algorithm, shortened the user-facing TOTP adapter name, expanded TFA and TOTP component documentation, moved QR SVG object-URL creation into `src/ui/reuse/qr-image-source.js`, and updated Security settings script registration to `/static/gateways/auth/security-prefs/index.js`.

## Enforcement and Ownership Fixes

TFA adapter disable state now survives restart, recovery-code consumption is atomic, accounts gated by mandatory TFA setup receive setup-pending tokens that cannot call protected non-TFA APIs, and TFA-owned browser strings, helpers, and styles were moved into the TFA gateway and TOTP adapter static assets.

## TFA Settings Injected into Security Section

Two-Factor Authentication settings now appear within User Settings → Security, contributed by the TFA gateway via the `auth:registerSecuritySection` capability rather than as a separate navigation item.

## Administration Page Fix

Fixed a missing `extendI18n` import that caused the Administration page to fail on navigation.

## Users Reset TFA Strings Fixed

Added missing `ui.app.users.reset_tfa` and `ui.app.users.tfa_reset_done` keys to the core UI locale bundles so the Users page action menu and reset-success toast render localized labels.

## Login Regression Corrected

Restored post-login required-email enforcement and moved the implementation into a Notify gateway-owned login helper so the Login page no longer owns direct email-route wiring while preserving required email validation behavior.

## TFA Setup Redirect and Security Access

Users with setup-pending TFA tokens are now sent directly to `/settings#security`. The full settings page chrome (navbar, topbar, footer) remains visible during the enforced setup flow so the user has a properly rendered page from which to configure their second factor. The auth security subsection registry and all TFA API paths are permitted for setup-pending tokens, and the sub-composer ResizeObserver is seeded with the initial column count so a layout measurement on first observation no longer triggers a redundant render that could re-open the setup popup.

## Administration TFA Moved

The Administration TFA settings are now rendered inside Administration → Security again instead of as a separate top-level Administration section.

## Administration TFA Strings Fixed

The TFA card inside Administration → Security now uses existing localized gateway/admin string keys, so its section title, enforcement label, and hint render correctly again.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a4201c685f2803dc1fdb3ad9d203f7e262919b03
