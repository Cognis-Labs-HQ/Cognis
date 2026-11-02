# Account and Session Fixes

**Feature Branch:** fix-account-and-navigation-errors

## Adapter-owned Contracts

Gateways expose the same `system:contracts` registry to their adapters through `ctx.capabilities`. An adapter may export `defineContracts(ctx)`; the host calls it during adapter bootstrap before initialization. Existing adapter bootstrap hooks can also declare contracts directly. Auth, Notify, TFA, Social, Study and Calendar use adapter scopes; the DB, Files and Registration factory loaders also accept the definition hook. Each definition belongs to `adapter:<gateway>:<adapter>` and follows gateway rollback, disable and reactivation. Nested adapter authority expires with its parent bootstrap, including detached asynchronous work. Runtime requests cannot register new contracts. Type-only imports from a provider’s public `contracts/` directory are authoring aids; executable cross-component calls still use ctx.

SMTP declares its email-purpose, delivery, policy and factory contracts during its own bootstrap. Runtime definitions live in `contracts/declarations.ts`; optional public action types live in `contracts/action-delivery.ts`. The notification gateway does not declare these provider APIs. It retains generic sender and delivery-receipt types. Other adapters use the same host registration mechanism without adding Core files.

## Email Contrast and Keyring State

Email content uses a block container instead of nesting paragraphs around generated blocks. Paragraphs, codes, list items and table cells carry explicit theme colors; dark-mode footer text and light-mode links have readable contrast.

Keyring Settings reads current state when the section is shown, including its first entry after login or refresh. Constructing the Settings catalog does not cache a missing result. Rendering uses the acknowledged state snapshot, and creation or destruction refreshes the displayed section. Identity changes and navigation still cancel late rendering and sensitive popups.

## Extensible Provider Contracts

Auth validation modes are registered through ctx with their own callbacks, availability and UI metadata. Administration preserves unavailable configured choices and validates new selections. A generic versioned runtime contract registry lets gateways, adapters and external modules publish contracts without Core domain files, preserving module authorization and lifecycle revocation. Verification helpers move to shared server reuse and Auth. SMTP owns its configuration schema and composable factories, including module-defined options. Emails use the receiving user’s theme, defaulting to light, with escaped HTML/plain-text content. TFA consumes method presentation metadata and the email provider’s code-length/cooldown policy. AI instructions now require this extension-first approach.

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

Module source credentials and cached discovery are shared across administrators and concealed on the server. Blank credential saves preserve the configured value. Keyring Settings waits for authoritative state, unfinished TFA enrollment requires a discard decision, and internal Settings/share redirects preserve SPA navigation. Keyring is **2.1.1** and TFA is **1.2.0**.

Implicit submissions from attached forms are handled in place and cannot submit a browser document request. Component submit handlers still receive the event. Internal page redirects use the SPA router; deliberate server-rendered destinations honor the same unsaved-change decision and recheck offline availability when resumed.

Administrator-created accounts now pass the complete role name through the provisioning flow to the account store; administrator, moderator and teacher accounts no longer fall back to the regular-user role.

## Bootstrap and Channels

SMTP owns action registration, rendering and queues. Register `notify:registerEmailPurpose` with a local identifier and an action function that builds the message from variables. Gateways, adapters and external modules register only within their own bootstrap scope; identifiers include the owner. Auth, Registration, TFA and Share own their message content. SMTP has no list of application purposes or templates.

Every `notify:sendEmail` call supplies an existing purpose and variables. There is no `templateId`. Missing or unknown purposes are rejected, and asynchronous actions are checked again before enqueueing. Registration closes on bootstrap completion, failure or timeout. Gateway completion hooks run under the same owner after providers bootstrap.

Notification categories use the existing `notify:registerCategory` capability. SMTP creates a queue during registration and returns a bound delivery handle to the gateway. The gateway remains sender-neutral. No send creates or infers a purpose; direct SMTP sends require an explicit registered purpose.

Gateway disable and module unmount dispose owned actions and pending deliveries. Re-enable restores fresh queues without replaying cancelled mail. Shared categories stay active while another registered owner remains active. Disabling the SMTP sender also closes its sessions and cancels pending delivery; re-enabling restores only registrations that still exist.

The default cooldown is fifteen seconds per normalized recipient within each queue. Independent queues drain concurrently. Only successful delivery advances the cooldown. Queue history retains up to 200 completed records per queue in memory. `sendEmail` returns the actual queue receipt; a queued receipt does not claim successful SMTP delivery.

The sender contract uses generic `test(recipient, config)` and optional bootstrap/channel/lifecycle hooks. The gateway calls `testSender(senderId, recipient, config)` and contains no SMTP-specific test, verification, invitation or login methods. Existing SMTP-specific gateway helpers and the separate template registry are removed.

## Review Corrections

GitLab repository validation includes the configured deployment prefix while preserving origin and namespace restrictions. Gateway lifecycle transitions are asynchronous and serialized: callers await enable/disable, bootstrap resources survive until their owner is disabled, and failed activation rolls back. Adapters receive their own bootstrap identity. SMTP TFA is **1.1.0**.

## Runtime Request Safety

Language switching and consent refreshes no longer fail because Calendar attempts notification registration during ordinary HTTP requests. Calendar registers its category once during bootstrap completion, after notification providers are available. Share sends through its already registered category, and Auth uses its completion hook without duplicate early registration. SMTP registration remains restricted to bootstrap; runtime handlers only resolve and use existing delivery capabilities. Calendar is **1.5.5**.

## Study Notification Delivery

Study request, content and deletion notifications use the category registered by Library bootstrap. Runtime delivery resolves the current notification capability and never performs registration, so SMTP bootstrap restrictions do not suppress delivery or visibility-change notices.

## Installation Credential Binding

Installation resolves credentials against the same provider, endpoint and namespace snapshot used to validate its repository URL. Concurrent source rebinding aborts before checkout, preventing a replacement endpoint’s credential from being sent to the previous host. GitHub’s API-to-repository host alias is applied only to GitHub sources.

## Layered TFA Discard Decisions

After enrollment cancellation is acknowledged, navigation is offered again to the remaining page guards. Discarding enrollment does not discard unrelated Settings changes. Keeping those changes stops navigation; explicitly discarding them resumes it. An unmounted page cannot resume a retained enrollment navigation.

## Component Boundaries

Email actions use `notify:registerEmailPurpose`, independent of transport. Sender contracts are public Core types, and adapter bootstrap receives ctx capabilities instead of the concrete gateway. Email verification reads the email provider's code length; TFA may be absent. Authenticated availability exposes no configuration. Sender requirements drive email checks, and stored addresses remain readable without email delivery. Validation policy uses `email`; an existing non-empty requirement cannot silently become disabled.

Registration and sharing adapters declare their own browser contributions. TFA discovers adapter language resources and uses common verification errors; issuer configuration stays with its adapter. Share maintenance follows gateway disable/reactivation. Share UI tests are separated by component ownership.

## Quiet Marketplace Polling

The marketplace revalidates one administrator-only `/api/v1/modules/marketplace-state` snapshot every fifteen seconds. Its ETag covers sources, installed state, cached discoveries, recommendations and restart requirements. An unchanged response is `304` with no body; the page retains its prepared catalog without fetching translations or redrawing. Source discovery runs once after mounting, hourly, and after source changes; manual Refresh still forces a scan. Hidden, offline and busy pages pause polling, and unmount aborts requests and removes the timer.

Catalog presentation includes a content-derived `ui.stringsRevision`. `extendI18n(base, stringsBaseUrl, { revision })` can reuse versioned authenticated bundles within the same account/session. Changed revisions fetch new strings; changed identities clear private bundles, late responses cannot repopulate another session, and failed loads can retry. Public bundles retain their existing cache and lifecycle invalidation.

Recommendation feeds are shared by the marketplace service, coalesce concurrent reads and stay fresh for five minutes. Failed refreshes retain the last successful list and back off for one minute; changing the configured URL selects a separate result, and manual Refresh bypasses freshness.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
- [f38348a9285ed82d5cac049cf511c246a6124ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38348a9285ed82d5cac049cf511c246a6124ac4)
- [1597944b8e745acf4c2116c2786df7cd0b7dc1a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/1597944b8e745acf4c2116c2786df7cd0b7dc1a9)
- [f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d)
- [9d818cedbcf80b2366c94b19d909adb55e191015](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d818cedbcf80b2366c94b19d909adb55e191015)
- [b9f8ff7](https://github.com/Cognis-Labs-HQ/Cognis/commit/b9f8ff7a5741bc4998bd416eefe89323532f68b1)
- [d9f39dd9958cd0411ff1df222e085c68252c6f0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/d9f39dd9958cd0411ff1df222e085c68252c6f0b)
- [6883ce70fc43b89c24305874461d66d81b388bf2](https://github.com/Cognis-Labs-HQ/Cognis/commit/6883ce70fc43b89c24305874461d66d81b388bf2)
