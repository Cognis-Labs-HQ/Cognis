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

Unlocks survive refreshes in the same authenticated tab/session. The password still encrypts the vault; neither a password nor a plaintext decryption key is persisted. Session storage holds only an AES-GCM encrypted unlock, wrapped using HKDF from the active session secret and bound to origin, account, server account-instance and session identity. The server must verify that binding before restoration. Finite relock deadlines are authenticated and remain absolute across refreshes. Explicit Lock, logout, account/instance/session changes and expiry invalidate restoration. Closing the tab or starting a new session requires unlocking again. The retired plaintext IndexedDB cache remains disabled.

## Offline status and navigation recovery

One persistent header notice uses the shared callout styles to show “You are in offline mode”. On reconnection it offers Refresh instead of reloading automatically; refresh respects unsaved-change and buffered-write guards. An unavailable page first restores the previous usable page. If restoration fails, it arms guarded automatic refresh on reconnection. Same-origin absolute and relative links use the SPA router, and the offline catalog retains both cached public pages and provider-authorized private routes.

## Offline polling limits

Offline Mode stops consent polling and ordinary recovery polling. Only one lightweight server health probe runs every fifteen minutes, even after repeated browser online events. Online connection-recovery failures back off to fifteen minutes. Consent polling backs off after failures to five minutes, stops entirely offline, and resumes after reconnection. Required cached legal acceptance still gates offline access.

## Sudden connection loss

When the active page cannot run offline, the host aborts its page lifecycle and quietly tries the previous offline-capable page. If that fails, the header notice explains the unavailable page and its content is cleared and guarded automatic refresh is armed for reconnection. Presence timers stop offline and restart on recovery. Successfully loaded public translation bundles are reused in the tab; protected catalogs still require authenticated requests.

## Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity. Reopening a shell no longer writes a theme preference automatically. Explicit UI preference changes use the active Profile client so they can enter its offline buffer, with account checks around delayed merges.

## One offline notice

Offline status and unavailable-page details share a single header notice without a Dismiss action. Reconnection replaces it with the connection-restored message and one Refresh button using shared button variants and action spacing. Shell defaults preserve explicit confirm, cancel and neutral button styles. Pages without a shell header use one inline notice.

## Offline assets and Calendar

Production asset resolution now traverses arrays, including route capability scripts and stylesheets. Versioned and unversioned public asset URLs share worker cache keys while module revision boundaries remain intact. Supported page code and inactive styles prepare in two background workers without mounting pages. Offline links require prepared code and their owner’s required account/session snapshots; navbar redraws preserve disabled state, so Meetings remains disabled. Private APIs and authenticated HTML remain outside the worker cache.

Calendar snapshots its calendar list, invitations and owned-event lists after verified authentication, with two background requests at a time. Cache invalidation refreshes those snapshots without blocking login. Cached events remain readable; event creation, edits, deletions, responses, status preferences and calendar edits enter the shared durable outbox. Pending creations and edits appear in cached event lists. Creation uses a stable operation UUID; a replay returns the existing event without another recurrence series or repeated invitation dispatch, and changed or cross-account reuse conflicts. Server authorization is checked on replay.

Calendar snapshots are tab-local and bounded to 4 MB/100 reads. The global outbox remains bounded to 1 MB/1,000 records/seven days. New recurring events show their first occurrence until server expansion. Creating calendar containers, generating meetings, share/password management and guest credentials require connectivity; share passwords are never buffered. Messages requires a cached room list and Study requires cached language/preference metadata before enabling offline navigation.

## Login and queued delivery

Successful password and TFA login use the existing SPA navigation capability to replace the login page with Dashboard. Login therefore keeps the verified tab and buffered work alive without invoking the browser’s page-close warning. Loading remains visible until navigation finishes; optional timezone synchronization runs afterward and rejects account switches. The warning still protects actual buffered changes when closing or reloading an authenticated tab.

Outbox replay starts in the background only after successful session authorization and required consent. A separate browser delivery lock serializes replay across tabs; short storage locks protect snapshots and acknowledgements without waiting for network delivery. Reads and new queued writes remain usable during a slow replay, and acknowledgements re-read storage so concurrent writes survive. Empty queues are not rewritten during authentication; unauthenticated pages do not warn about another account’s buffer.

## Offline checks and warnings

The Offline Mode banner offers Recheck Connectivity with shared button styling and a busy state. It immediately calls `/api/v1/system/healthcheck`, coalesces simultaneous checks, then reauthorizes the session and attempts queued delivery when the server is reachable. Required consent still gates replay. Failure keeps Offline Mode active without an error popup. Automatic checks remain limited to once every fifteen minutes; this explicit action can run sooner. Refresh remains available after recovery.

The native close/reload guard covers protected records newly created in the current page and session. A real reload starts with that guard clear while preserving queued records for replay; new meaningful edits arm it again. Viewed Study markers and analytics are background activity and do not arm it. Other tabs’ records, previously persisted records and merely rendering pages do not create a warning. Provider disposal keeps current-page edits protected until delivery or removal.

## Refresh unlocks and module loading

Host route-asset preparation registers its flow and cache capabilities once per shared ctx. Bundled scripts and source imports from external modules reuse the same registrations and prepared-route state, so opening Meetings no longer fails with a duplicate `offline:prepareRouteAssets` flow.

## Shared top banners

The host exposes `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` before providers or pages mount. Descriptors accept a plain-text `title`, sanitized `bodyHtml`, trusted `actionsHtml` and an `info`, `success`, `warning` or `danger` variant. The returned handle has `element` and `remove()`. Reusing an ID replaces only that owner’s notice; an older disposer cannot remove its replacement. Bind provider/page lifetimes with `signal`. Lower priorities appear first. Titles are escaped; callers must sanitize rich text. Shared top banners retain an opaque, theme-aware background while scrolling. Restored-connection, warning and danger notices use the existing theme colors.

Offline Mode and Broadcast now use one sticky stack at the very top of the document, above the app header. Offline Mode has priority, cannot be dismissed, and retains Recheck Connectivity and the recovered Refresh action. Removing or dismissing an announcement does not remove Offline Mode. Broadcast polling skips disconnected requests and its provider disposes its bar and timer.

## Empty offline Study pages

Prepared Study pages remain navigable in a verified, consented offline session even without private content snapshots. Missing language/preference metadata produces empty navigation data. Explore mounts its normal empty browser and shows “No offline cached content available” instead of route-unavailable feedback or error toasts. Flashcards also retains an empty page when deck data or a required view resource is missing. Notices are scoped to the current page and deduplicated. Cache misses do not conceal access or consent denials. Library and flashcard providers prepare their public translations and light templates online; private data stays in the bounded tab-local caches.

## Direct Loads and Styles

Direct loads and refreshes retain their route styles while offline assets prepare. Host and component builds preserve stylesheet source identity, and logical and emitted URLs share ownership. Asset responses no longer wait for background cache writes; failures are logged and do not delay delivery. Web fonts load separately from the theme, so an unavailable font server cannot block the page or loading wheel. The selected font still applies when available, with the existing browser fallback while it loads.

## Offline Study Assets

Study prepares its lazy popup icons, drawing template, drawing styles and close icons while online, without mounting the drawing pad or blocking login. Preparation retries after recovery and stops with its provider. Previously cached characters can open the pad for the first time offline. Content editing is unavailable offline; an open detail popup disables Edit when connectivity is lost. Missing decorative popup icons retain their translated action label instead of opening a resource-error dialog.

## Durable Queued Results

Once a write is durably queued, optional activity capture or view-refresh failures do not turn it into a failed write. Calendar can open details from cached event lists, including newly queued events and later pending edits. Concurrent event submissions share one request. Messages clear their draft only after acknowledgement or persistence; room-refresh failures preserve that receipt. Profile text, posts and images likewise retain their completed result when a view refresh fails. Availability refreshes cannot hold up completed Calendar writes.

Provider lifecycle failures now record the failing script path without query data and whether importing or mounting failed. Optional activity failures are logged separately from the durable user action.

## Offline Availability

The offline route registry survives repeated bundled and directly served imports. Prepared route descriptors retain availability when reconstructed with the same script, styles and capability providers; changed assets require preparation again. Messages prepares its room list, translations and emoji catalogs after verified sign-in. The page can open offline before its first online visit; only cached rooms with cached threads open automatically, and selecting an uncached thread gives a targeted information toast. Explore keeps available cached collections when another collection or viewed-marker snapshot is missing. Access and consent denials still propagate. Banner actions sit directly in the shared action row, removing the inherited vertical offset.

## Shared Study Favourites

The Study provider exposes `study:favourites` with scoped `load`, `toggle` and `has` operations. Rendering utilities resolve this ctx capability instead of keeping a separate cache for each loader. Favourites prepare after verified authentication, overlay pending changes and share account/session-bound state across Explore, flashcards and repeated imports. Missing optional favourite snapshots produce an empty selection with queued changes applied; they do not hide cached content or show an update-failed toast. Account changes clear the visible selection and access denials are never treated as cache misses.

## Cached Public Resources

Shared reuse styles, including toasts and secret visibility controls, are included in the worker boot manifest in both logical and built forms. Calendar prepares its lazy status stylesheet through its provider. The SPA route catalog is shared through ctx across bundled and directly served imports, preserving authorized Study routes when another loader first reads the catalog offline. Private page snapshots remain account/session-bound and authorization and consent checks still apply.

Cached public assets return immediately. On-demand background checks are coalesced and throttled. Complete response bodies are compared before replacement, unchanged bytes are retained, and a response with an older Last-Modified date cannot replace a newer file. Missing files, connection failures, truncated bodies and failed cache writes retain the prior complete file. A changed response replaces it only through a successful atomic cache write. Explicit access denial, private/no-store responses, consent changes and revoked module access still enforce policy. API responses and authenticated documents remain network-only in the worker.

## Persistent Asset Cache

All built public page bundles, dynamic chunks, styles and emitted media are prepared by the worker without executing pages or fetching private data. Public responses fetched later are cached automatically. Worker activation carries complete public files into the new generation before retiring old storage; only current catalog-authorized module revisions can be carried over. A page visit is not required to download its public bundles. Private content still needs an authorized owner-prepared snapshot.

## Enrolled Offline Workspace

After verified sign-in, Study prepares schemas, readable locations, forms, viewed markers and opted-in lightweight collections for enrolled learning and teaching languages. Flashcards prepares its list and up to 80 matching decks with card details, within its existing bounded cache. Enrollment changes trigger preparation again. Two workers limit concurrent reads; provider disposal, account changes, access denial and cached legal consent remain enforced. Pages need no prior visit; private snapshots remain scoped to the verified tab/session.

Offline Profile access requires the complete prepared own-profile snapshot: text, posts, connections, preferences and bounded avatar/banner images. Other users’ profiles are blocked even if previously cached. Administration, Modules, Users and Shares remain unavailable offline. Settings opens its local core controls; saved font, theme, language, timezone and display preferences apply locally and queue for server delivery. Email verification, account actions and contributed settings requiring a server remain unavailable offline.

The native close/reload guard covers protected records newly created in the current page and session. A real reload starts with that guard clear while preserving queued records for replay; new meaningful edits arm it again. Viewed Study markers and analytics are background activity and do not arm it. Other tabs’ records, previously persisted records and merely rendering pages do not create a warning. Provider disposal keeps current-page edits protected until delivery or removal.

The host exposes `ui:languageCatalog.load` through ctx and prepares the shared language catalog after verified sign-in. Core locale catalogs are included in the public boot set. Settings and the navbar use that same lifecycle-scoped read; saving a language preference offline keeps the working page open and applies the preference to later client navigation.

## Offline Study Practice

Library management and its edit/search/request pages require a connection. The Study hub and submenu hide those links offline, including immediately after disconnection; Explore remains available for cached browsing and drawing. The Library provider declares only Explore as an offline session route.

Enrollment preparation caches the shared schema catalog as well as each enrolled language’s catalog. Drawing and Flashcards can use their normal schema reads without a prior online page visit. Flashcards prepares its Share translations alongside its Study translations and gallery template, and reads selected-language collections using the same schema-qualified requests as the enrollment warmer. Prepared decks can open gallery and practice views offline. Audio, dictionary fetching, content edits and access/consent checks keep their existing restrictions.
