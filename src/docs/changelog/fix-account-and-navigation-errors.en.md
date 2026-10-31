# Account and Session Fixes

**Feature Branch:** fix-account-and-navigation-errors

## Reliable User Administration

Users identifies the current account by its stored account ID, including opaque SSO sessions. Self-management controls respect server protections. Failed account-detail loads use a Users-owned translation. A follow-up refresh failure does not change an acknowledged mutation into a failed save; the previous list remains visible with a refresh warning.

## Profile Editing and Roles

Profile edit forms use the owning component’s display-name, bio, location and website limits. Account role synchronization resolves a profile’s public handle from its immutable account ID before updating role and visibility.

## Responsive Session Navigation

Logout clears private session data without waiting for public service-worker route maintenance. Identical worker policy requests share one exchange without merging changed access decisions. The language switcher waits for its catalog provider and hides account-only controls when signed out. Bundled and directly served router copies share document state, listeners and mount cancellation, including Settings to Dashboard navigation.

## Bounded SSO Registration Attempts

Invitation-gated SSO identities are held before account, profile or email provisioning. Cancelled or expired attempts cannot resume; expiry is enforced at the exact deadline for registration and TFA. Enabling the public registration adapter still permits SSO account creation independently of native public signup. Existing accounts are not deleted based on their provider or age.

## Purpose Scoped Email Cooldowns

The shared SMTP verification interval is fifteen seconds. Cooldowns are normalized by recipient and isolated by message purpose, so verification, login codes, login links, invitations and tests do not delay one another. Same-purpose queue reservations use the configured interval and actual successful delivery time; failed direct sends do not consume a cooldown.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
