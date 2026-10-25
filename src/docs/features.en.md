# Platform Features

## Overview

Cognis is a self-hosted language-study platform that combines structured learning content with social features, pluggable authentication, flexible persistence, and a real-time collaboration readiness layer. This document describes the capabilities available out of the box and the adapter coverage for each area.

## Core capabilities

- **Authentication and identity** — pluggable auth adapters support local credentials, LDAP directory services, SAML 2.0, and OAuth2/OIDC providers such as Google or Microsoft. All providers are managed through the auth gateway's admin API without code changes.
- **Modular language content delivery** — the module system allows curriculum units, activity types, and integrations to be packaged as modules and installed at runtime. Core modules are always present; optional modules can be enabled or disabled by an admin.
- **Live collaboration readiness** — the platform is designed to integrate open-source communication tooling such as Jitsi for real-time study sessions.
- **Configurable UI pages** — every page uses `createPageComposer` for reusable layout slots and per-user preference persistence. Users can customise widget placement on their profile and study pages.
- **Lightweight social networking** — public profiles, microblog-style posts with per-post visibility, follower/following graphs, and block management.
- **API-first architecture** — every feature is accessible via a versioned HTTP API with stable `{ data }` / `{ error }` response envelopes.
- **Documentation browser** — docs are served directly from the running application at `/docs`, auto-discovered from `docs/` directories across the codebase.

## Learning modes

- **Independent learners** work through modular language content at their own pace using the self-study surface.
- **Teachers and tutors** guide sessions and structure activities around reusable modules. The `teacher` role unlocks instructor-specific API access.
- **Communities** organise shared study rhythms using social features, posts, and the follow graph.

## Adapter coverage

| Area          | Built-in adapters               | Notes                                                           |
| ------------- | ------------------------------- | --------------------------------------------------------------- |
| Database      | `memory`, `mariadb`, `postgres` | Swap by setting `DB_TYPE`; no code changes needed               |
| Auth          | `local`, `ldap`, `saml`, `oidc` | Multiple providers can be enabled simultaneously                |
| File storage  | `local`                         | Stores uploads on the container filesystem; mounted as a volume |
| Notifications | `smtp`                          | Activated by setting `COGNIS_SMTP_HOST`                         |

## Notification features

When the SMTP adapter is configured, Cognis can send:

- Two-factor authentication (TFA) codes.
- Email verification links for new accounts.
- System notifications dispatched via `POST /api/v1/notify/send` (admin).

Notification delivery respects per-user channel preferences stored in the database.

## Admin capabilities

Admins have access to:

- Full gateway management (enable/disable gateways, configure auth adapters).
- Module installation and lifecycle management.
- Per-category file size limits (`image`, `video`, `text`, `global`).
- System health and diagnostics endpoints.
- Deletion of any file or post on the platform.

## Signup and Search

Administration stores Allow Public Native Registration independently of the registration adapter. Keep the public adapter enabled and turn native signup off to allow SSO account provisioning without allowing public username/password signup. Disabling the adapter also disables that provisioning path; invitation tokens remain available through their own adapter. Global search streams partial results, cancels replaced queries and bounds provider execution. Documentation titles appear before content; four cancellable workers index document bodies instead of fetching the entire library at once.

## Connection and Accounts

Offline worker policy and route metadata use a separate control cache. Catalog requests coalesce, policy changes keep their order, messages close their ports, and background asset cleanup cannot delay acknowledgements. Installation uses at most four concurrent asset requests. Login schedules public-cache maintenance without waiting for it and shows the shared loading wheel during credential, TFA-code and SSO authorization requests. Required interactive setup remains usable. Reachability checks use a fast liveness response; detailed component probes remain at `/api/v1/system/health`.

Administrators and owners can open `/invite` without founder status. Invitation policy still controls issuance. The enabled Registration Token adapter contributes `cognisctl invite:token:generate` to create a standalone token without SMTP delivery, and `cognisctl invite:email:send person@example.com` to send an invitation. Omitting the email opens the CLI input wizard. Both commands use the authenticated registration API and respect role, domain and delivery restrictions.

## User List Layout

Users fills the available composer width. Each account is a complete collapsible row with identity, role, status and management controls in its header; expanded metadata spans the row beneath it. Details use a responsive label-and-value grid, localized role and provider names, and separate email rows with primary and verification badges. Small screens wrap header controls and show metadata in one column.

## Account privacy and keyring isolation

SSO accounts use opaque random IDs. Provider IDs are stored separately and exposed only to administrators; public usernames never include them. Auth reserves usernames before profile or email side effects: duplicate names within one provider are rejected, while different providers receive a short random suffix when needed. Users lists and action endpoints distinguish public `username` from internal `accountId`.

Existing local accounts continue to work when legacy SSO records are present. Startup does not require a database reset. Legacy SSO sign-in and provisioning are rejected individually until those accounts are recreated with opaque IDs. No account IDs, relationships or meetings are migrated or deleted automatically.

Encrypted browser vaults are cached independently by origin, account ID and server account-instance ID. The server must verify the account and instance before a cache is loaded. Passwords and decryption keys remain in memory and are never persisted; old IndexedDB unlock keys are retired. Reloading requires the keyring password again, unless a password login successfully decrypts the vault. Account changes cancel outstanding prompts and cryptographic work. Unlock never creates a missing keyring: only explicit setup or Create can do so.

## Offline status and navigation recovery

A dismissible header notice uses the shared callout styles to show “You are in offline mode”. On reconnection it offers Refresh instead of reloading automatically; refresh respects unsaved-change and buffered-write guards. An unavailable page first restores the previous usable page. If restoration fails, it arms guarded automatic refresh on reconnection. Same-origin absolute and relative links use the SPA router, and the offline catalog retains both cached public pages and provider-authorized private routes.

## Offline polling limits

Offline Mode stops consent polling and ordinary recovery polling. Only one lightweight server health probe runs every fifteen minutes, even after repeated browser online events. Online connection-recovery failures back off to fifteen minutes. Consent polling backs off after failures to five minutes, stops entirely offline, and resumes after reconnection. Required cached legal acceptance still gates offline access.

## Sudden connection loss

When the active page cannot run offline, the host aborts its page lifecycle and quietly tries the previous offline-capable page. If that fails, an inline offline notice replaces the unavailable content and guarded automatic refresh is armed for reconnection. Presence timers stop offline and restart on recovery. Successfully loaded public translation bundles are reused in the tab; protected catalogs still require authenticated requests.

## Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity. Reopening a shell no longer writes a theme preference automatically. Explicit UI preference changes use the active Profile client so they can enter its offline buffer, with account checks around delayed merges.
