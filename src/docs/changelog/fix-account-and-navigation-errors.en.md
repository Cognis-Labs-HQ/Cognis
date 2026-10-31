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

## Bootstrap Purposes

SMTP purposes must be registered through `ctx` during gateway or module bootstrap. Obtain `notify:registerSmtpPurpose`, await it with a local purpose name and retain the returned owner-scoped identifier. Each registration creates a dedicated queue and recipient cooldown state; the adapter has no built-in purpose list.

Every `notify:sendEmail` call must include an existing `purpose`. Missing and unknown purposes fail before SMTP transport; sends cannot create purposes implicitly. Registration is rejected after bootstrap returns, fails or times out, including through retained callbacks and detached asynchronous work. Modules enabled after startup may register during their own bootstrap. Module disable/uninstall disposes its queues, rejects pending deliveries and closes active SMTP sessions.

The default interval is fifteen seconds per normalized recipient within each purpose. Independent purposes drain concurrently, so a slow connection, retry or cooldown in one queue cannot block another. Cooldowns advance only after successful delivery. Queue inspection combines all purposes, includes their identifiers and retains up to 200 completed records per queue. Queues are in memory.

The generic envelope carries `purpose`; specialized SMTP send/queue helpers now take the purpose as their first argument. The gateway test helper takes `(senderId, purpose, recipientEmail, config)`. Existing Notification Gateway helpers supply purposes registered by that gateway. Generic component/module callers register their own purposes during bootstrap and reuse the returned identifiers at runtime.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)

- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)

- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
