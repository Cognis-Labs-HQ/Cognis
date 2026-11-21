# Technical Reference

The public interfaces and operational rules of Platform Features.

## Interfaces

### Core capabilities

- **Authentication and identity** — pluggable auth adapters support local credentials, LDAP directory services, SAML 2.0, and OAuth2/OIDC providers such as Google or Microsoft. All providers are managed through the auth gateway's admin API without code changes.
- **Modular language content delivery** — the module system allows curriculum units, activity types, and integrations to be packaged as modules and installed at runtime. Core modules are always present; optional modules can be enabled or disabled by an admin.
- **Live collaboration readiness** — the platform is designed to integrate open-source communication tooling such as Jitsi for real-time study sessions.
- **Configurable UI pages** — every page uses `createPageComposer` for reusable layout slots and per-user preference persistence. Users can customise widget placement on their profile and study pages.
- **Lightweight social networking** — public profiles, microblog-style posts with per-post visibility, follower/following graphs, and block management.
- **API-first architecture** — every feature is accessible via a versioned HTTP API with stable `{ data }` / `{ error }` response envelopes.
- **Documentation browser** — docs are served directly from the running application at `/docs`, auto-discovered from `docs/` directories across the codebase.

### Admin capabilities

Admins have access to:

- Full gateway management (enable/disable gateways, configure auth adapters).
- Module installation and lifecycle management.
- Per-category file size limits (`image`, `video`, `text`, `global`).
- System health and diagnostics endpoints.
- Deletion of any file or post on the platform.

## Configuration

### Offline Personal Settings

See the [shared contract](/docs/api/technical) for this behavior.

### Configurable Top Banners

See the [shared contract](/docs/api/technical) for this behavior.

## Behavior

### Bounded Snapshot Replacements

See the [shared contract](/docs/api/technical) for this behavior.

### Account ID Notification Delivery

See the [shared contract](/docs/api/technical) for this behavior.

### Overview

Cognis is a self-hosted language-study platform that combines structured learning content with social features, pluggable authentication, flexible persistence, and a real-time collaboration readiness layer. This document describes the capabilities available out of the box and the adapter coverage for each area.

### Learning modes

- **Independent learners** work through modular language content at their own pace using the self-study surface.
- **Teachers and tutors** guide sessions and structure activities around reusable modules. The `teacher` role unlocks instructor-specific API access.
- **Communities** organise shared study rhythms using social features, posts, and the follow graph.

### Adapter coverage

| Area          | Built-in adapters               | Notes                                                           |
| ------------- | ------------------------------- | --------------------------------------------------------------- |
| Database      | `memory`, `mariadb`, `postgres` | Swap by setting `DB_TYPE`; no code changes needed               |
| Auth          | `local`, `ldap`, `saml`, `oidc` | Multiple providers can be enabled simultaneously                |
| File storage  | `local`                         | Stores uploads on the container filesystem; mounted as a volume |
| Notifications | `smtp`                          | Activated by setting `COGNIS_SMTP_HOST`                         |

### Notification features

When the SMTP adapter is configured, Cognis can send:

- Two-factor authentication (TFA) codes.
- Email verification links for new accounts.
- System notifications dispatched via `POST /api/v1/notify/send` (admin).

Notification delivery respects per-user channel preferences stored in the database.

### Signup and Search

Administration stores Allow Public Native Registration independently of the registration adapter. Keep the public adapter enabled and turn native signup off to allow SSO account provisioning without allowing public username/password signup. Disabling the adapter also disables that provisioning path; invitation tokens remain available through their own adapter. Global search streams partial results, cancels replaced queries and bounds provider execution. Documentation titles appear before content; four cancellable workers index document bodies instead of fetching the entire library at once.

### Connection and Accounts

Offline worker policy and route metadata use a separate control cache. Catalog requests coalesce, policy changes keep their order, messages close their ports, and background asset cleanup cannot delay acknowledgements. Installation uses at most four concurrent asset requests. Login schedules public-cache maintenance without waiting for it and shows the shared loading wheel during credential, TFA-code and SSO authorization requests. Required interactive setup remains usable. Reachability checks use a fast liveness response; detailed component probes remain at `/api/v1/system/health`.

See the [shared contract](/docs/adapters/registration/token/technical) for this behavior.

### User List Layout

Users fills the available composer width. Each account is a complete collapsible row with identity, role, status and management controls in its header; expanded metadata spans the row beneath it. Details use a responsive label-and-value grid, localized role and provider names, and separate email rows with primary and verification badges. Small screens wrap header controls and show metadata in one column.

### Offline status and navigation recovery

One persistent header notice uses the shared callout styles to show “You are in offline mode”. On reconnection it offers Refresh instead of reloading automatically; refresh respects unsaved-change and buffered-write guards. An unavailable page first restores the previous usable page. If restoration fails, it arms guarded automatic refresh on reconnection. Same-origin absolute and relative links use the SPA router, and the offline catalog retains both cached public pages and provider-authorized private routes.

### Offline polling limits

Offline Mode stops consent polling and ordinary recovery polling. Only one lightweight server health probe runs every fifteen minutes, even after repeated browser online events. Online connection-recovery failures back off to fifteen minutes. Consent polling backs off after failures to five minutes, stops entirely offline, and resumes after reconnection. Required cached legal acceptance still gates offline access.

### Sudden connection loss

When the active page cannot run offline, the host aborts its page lifecycle and quietly tries the previous offline-capable page. If that fails, the header notice explains the unavailable page and its content is cleared and guarded automatic refresh is armed for reconnection. Presence timers stop offline and restart on recovery. Successfully loaded public translation bundles are reused in the tab; protected catalogs still require authenticated requests.

### One offline notice

Offline status and unavailable-page details share a single header notice without a Dismiss action. Reconnection replaces it with the connection-restored message and one Refresh button using shared button variants and action spacing. Shell defaults preserve explicit confirm, cancel and neutral button styles. Pages without a shell header use one inline notice.

### Offline assets and Calendar

Production asset resolution now traverses arrays, including route capability scripts and stylesheets. Versioned and unversioned public asset URLs share worker cache keys while module revision boundaries remain intact. Supported page code and inactive styles prepare in two background workers without mounting pages. Offline links require prepared code and their owner’s required account/session snapshots; navbar redraws preserve disabled state, so Meetings remains disabled. Private APIs and authenticated HTML remain outside the worker cache.

Calendar snapshots its calendar list, invitations and owned-event lists after verified authentication, with two background requests at a time. Cache invalidation refreshes those snapshots without blocking login. Cached events remain readable; event creation, edits, deletions, responses, status preferences and calendar edits enter the shared durable outbox. Pending creations and edits appear in cached event lists. Creation uses a stable operation UUID; a replay returns the existing event without another recurrence series or repeated invitation dispatch, and changed or cross-account reuse conflicts. Server authorization is checked on replay.

Calendar snapshots are tab-local and bounded to 4 MB/100 reads. The global outbox remains bounded to 1 MB/1,000 records/seven days. New recurring events show their first occurrence until server expansion. Creating calendar containers, generating meetings, share/password management and guest credentials require connectivity; share passwords are never buffered. Messages requires a cached room list and Study requires cached language/preference metadata before enabling offline navigation.

### Login and queued delivery

Successful password and TFA login use the existing SPA navigation capability to replace the login page with Dashboard. Login therefore keeps the verified tab and buffered work alive without invoking the browser’s page-close warning. Loading remains visible until navigation finishes; optional timezone synchronization runs afterward and rejects account switches. The warning still protects actual buffered changes when closing or reloading an authenticated tab.

See the [shared contract](/docs/api/technical) for this behavior.

### Offline checks and warnings

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Refresh unlocks and module loading

See the [shared contract](/docs/api/technical) for this behavior.

### Shared top banners

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Empty offline Study pages

See the [shared contract](/docs/api/technical) for this behavior.

### Direct Loads and Styles

See the [shared contract](/docs/api/technical) for this behavior.

### Offline Study Assets

See the [shared contract](/docs/gateways/study/technical) for this behavior.

### Durable Queued Results

See the [shared contract](/docs/api/technical) for this behavior.

Provider lifecycle failures now record the failing script path without query data and whether importing or mounting failed. Optional activity failures are logged separately from the durable user action.

### Offline Availability

See the [shared contract](/docs/api/technical) for this behavior.

### Shared Study Favourites

See the [shared contract](/docs/api/technical) for this behavior.

### Cached Public Resources

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Persistent Asset Cache

See the [shared contract](/docs/api/technical) for this behavior.

### Enrolled Offline Workspace

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Offline Study Practice

See the [shared contract](/docs/gateways/study/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Prepared Flashcards

See the [shared contract](/docs/api/technical) for this behavior.

### Offline Orbitron

See the [shared contract](/docs/api/technical) for this behavior.

### Smooth Recovery and Navigation

See the [shared contract](/docs/api/technical) for this behavior.

### Consistent Offline Feedback

See the [shared contract](/docs/api/technical) for this behavior.

### Visible Offline Destinations

See the [shared contract](/docs/gateways/study/technical) for this behavior.

### Live UI Language Changes

See the [shared contract](/docs/api/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Fewer Online Requests

See the [shared contract](/docs/api/technical) for this behavior.

### Offline Logout Protection

Logout remains visible but disabled in Offline Mode, using the same disabled styling as unavailable menu destinations. It becomes available again when connectivity is restored. Activating the control while offline cannot start logout or discard the local session before server-side token invalidation is possible.

### Session and Component Boundaries

Only an identical consecutive mutation from the same delivery owner is suppressed; changes to methods, paths, media types or intervening operations retain their order. Offline enqueueing and replay require Auth’s `session:isOfflineValid` capability as well as current consent. The capability checks verified setup readiness, account, token and session expiry without network requests, including when storage locks delay persistence. An unavailable Auth contract fails closed. Settings binds account controls before optional email loading; disabling Notify hides email management and leaves Archive, Deactivate and Delete usable. Users and Administration consume Notify through scoped capabilities instead of concrete UI imports. Notify supplies administrator email reads, online-only resend and SMTP availability; absent email metadata is shown as unknown. Auth skips normal account setup for alternate guest sessions and uses Share’s classification capability to exempt share guests at the server boundary. Real account email/TFA setup remains enforced.

### Account-bound Queues

See the [shared contract](/docs/api/technical) for this behavior.

### Acknowledged Favourites

See the [shared contract](/docs/api/technical) for this behavior.

### Independent Emoji Usage

See the [shared contract](/docs/api/technical) for this behavior.

### Account-aware User Menus

See the [shared contract](/docs/api/technical) for this behavior.

### Complete Cached Assets

See the [shared contract](/docs/api/technical) for this behavior.

## Security

### Account privacy and keyring isolation

See the [shared contract](/docs/adapters/auth/local/technical) for this behavior.

See the [shared contract](/docs/adapters/auth/local/technical) for this behavior.

See the [shared contract](/docs/api/technical) for this behavior.

### Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity. Reopening a shell no longer writes a theme preference automatically. Explicit UI preference changes use the active Profile client so they can enter its offline buffer, with account checks around delayed merges.

## Reference

### Acknowledged Preference Snapshots

See the [shared contract](/docs/api/technical) for this behavior.
