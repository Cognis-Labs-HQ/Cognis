# Account and Session Fixes

**Feature Branch:** fix-account-and-navigation-errors

## Reliable User Administration

Users identifies the current account by its stored account ID, including opaque SSO sessions. Self-management controls respect server protections. Failed account-detail loads use a Users-owned translation. A follow-up refresh failure does not change an acknowledged mutation into a failed save; the previous list remains visible with a refresh warning.

## Profile Editing and Roles

Profile edit forms use the owning component’s display-name, bio, location and website limits. Account role synchronization resolves a profile’s public handle from its immutable account ID before updating role and visibility.

Profile Save runs the existing form validator before closing the editor. Display name is required, including rejection of whitespace-only values.

## Responsive Session Navigation

Logout clears private session data without waiting for public service-worker route maintenance. Identical worker policy requests share one exchange without merging changed access decisions. The language switcher waits for its catalog provider and hides account-only controls when signed out. Bundled and directly served router copies share document state, listeners and mount cancellation, including Settings to Dashboard navigation.

## Bounded SSO Registration Attempts

Invitation-gated SSO identities are held before account, profile or email provisioning. Cancelled or expired attempts cannot resume; expiry is enforced at the exact deadline for registration and TFA. Enabling the public registration adapter still permits SSO account creation independently of native public signup. Existing accounts are not deleted based on their provider or age.

## Purpose Scoped Email Cooldowns

The shared SMTP verification interval is fifteen seconds. Cooldowns are normalized by recipient and isolated by message purpose, so verification, login codes, login links, invitations and tests do not delay one another. Same-purpose queue reservations use the configured interval and actual successful delivery time; failed direct sends do not consume a cooldown.

## Shared Sources and Setup

Module source credentials and cached discovery are shared across administrators and concealed on the server. Blank credential saves preserve the configured value. Keyring Settings waits for authoritative state, unfinished TFA enrollment requires a discard decision, and internal Settings/share redirects preserve SPA navigation. Keyring is **2.1.1** and TFA is **1.1.20**.

Implicit submissions from attached forms are handled in place and cannot submit a browser document request. Component submit handlers still receive the event. Internal page redirects use the SPA router; deliberate server-rendered destinations honor the same unsaved-change decision and recheck offline availability when resumed.

Administrator-created accounts now pass the complete role name through the provisioning flow to the account store; administrator, moderator and teacher accounts no longer fall back to the regular-user role.

## Bootstrap and Channels

SMTP owns action registration, rendering and queues. Register `notify:registerSmtpPurpose` with a local identifier and an action function that builds the message from variables. Gateways, adapters and external modules register only within their own bootstrap scope; identifiers include the owner. Auth, Registration, TFA and Share own their message content. SMTP has no list of application purposes or templates.

Every `notify:sendEmail` call supplies an existing purpose and variables. There is no `templateId`. Missing or unknown purposes are rejected, and asynchronous actions are checked again before enqueueing. Registration closes on bootstrap completion, failure or timeout. Gateway completion hooks run under the same owner after providers bootstrap.

Notification categories use the existing `notify:registerCategory` capability. SMTP creates a queue during registration and returns a bound delivery handle to the gateway. The gateway remains sender-neutral. No send creates or infers a purpose; direct SMTP sends require an explicit registered purpose.

Gateway disable and module unmount dispose owned actions and pending deliveries. Re-enable restores fresh queues without replaying cancelled mail. Shared categories stay active while another registered owner remains active. Disabling the SMTP sender also closes its sessions and cancels pending delivery; re-enabling restores only registrations that still exist.

The default cooldown is fifteen seconds per normalized recipient within each queue. Independent queues drain concurrently. Only successful delivery advances the cooldown. Queue history retains up to 200 completed records per queue in memory. `sendEmail` returns the actual queue receipt; a queued receipt does not claim successful SMTP delivery.

The sender contract uses generic `test(recipient, config)` and optional bootstrap/channel/lifecycle hooks. The gateway calls `testSender(senderId, recipient, config)` and contains no SMTP-specific test, verification, invitation or login methods. Existing SMTP-specific gateway helpers and the separate template registry are removed.

## Review Corrections

GitLab repository validation includes the configured deployment prefix while preserving origin and namespace restrictions. Gateway lifecycle transitions are asynchronous and serialized: callers await enable/disable, bootstrap resources survive until their owner is disabled, and failed activation rolls back. Adapters receive their own bootstrap identity. SMTP TFA is **1.0.38**.

## Runtime Request Safety

Language switching and consent refreshes no longer fail because Calendar attempts notification registration during ordinary HTTP requests. Calendar registers its category once during bootstrap completion, after notification providers are available. Share sends through its already registered category, and Auth uses its completion hook without duplicate early registration. SMTP registration remains restricted to bootstrap; runtime handlers only resolve and use existing delivery capabilities. Calendar is **1.5.5**.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
- [f38348a9285ed82d5cac049cf511c246a6124ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38348a9285ed82d5cac049cf511c246a6124ac4)
- [1597944b8e745acf4c2116c2786df7cd0b7dc1a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/1597944b8e745acf4c2116c2786df7cd0b7dc1a9)
