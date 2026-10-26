# Offline Navigation

**Feature Branch:** feature-offline-navigation

## Offline Contract

Production builds prepare a neutral recovery shell. License and Error work offline; unavailable route links are disabled and unavailable direct navigation stays quiet. A real server connection failure activates fallback even when the browser reports an active network.

Declare `public: true` and `offline: { assets: [...] }` on a SPA route. List every public runtime dependency, including locale catalogs and data files. Pages must work without API requests, private account data or host-wide provider discovery. Private routes cannot opt in. Use route links for navigation controls. Unknown or unvisited dependencies remain unavailable.

The service worker does not cache API responses, credentials or authenticated HTML. Module invalidation clears the public route catalog and module assets; revision-qualified assets must match the current catalog. Remote changes cannot be observed while disconnected: only the last known public revision is available. Recovery refreshes the catalog and reloads through the dirty-page guard, restoring fresh server authorization. Worker updates wait for existing tabs to close and prepare the recovery set before activation. A first visit without an installed worker cannot start offline.

## Reminder Selection

Select several reminders using the standard visible checkboxes. Each selection remains visible and is saved together. Removing every selection disables reminders, including when the calendar has defaults. Existing custom reminder offsets remain available when editing.

## Offline Study

Offline Mode is enabled by default in Settings. Turning it off restores the existing connection warning and error behavior and disables worker fallback. With it enabled, connection loss quietly enters offline mode; unavailable navigation is blocked without an error popup.

Study keeps bounded lightweight JSON snapshots in the current tab: schemas, permitted character/card data, locations, viewed IDs, favourites and previously opened decks. Language schemas opt in with `metadata.offline: { cache: "lightweight" }`. The Library cache holds at most 16 MB and 100 reads; other read caches hold at most 4 MB and 100 reads. No audio bytes, dictionary responses, credentials or authenticated documents are persisted.

Explore previews resolve relationships from already-authorized cached rows. Drawing and flashcard practice work locally. Completions, reviews, viewed IDs and final favourite states are queued for delivery; progress, XP and rewards become authoritative only after server acknowledgement. Audio and dictionary/ElevenLabs requests stop. Content edits, deletion and sharing require connectivity. Only previously loaded content within the cache limits is available.

Private Study requires the same previously verified, unexpired account session in the same tab. Reloads and first visits retain the public-only offline contract. Account/session changes, preference changes, module lifecycle changes and provider disposal invalidate private snapshots. Server revocations cannot be learned while disconnected. Recovery uses the existing unsaved-change guard and reloads to refresh server authorization.

## Queued Delivery and Consent

The host exposes `offline:outbox`, `offline:state` and `offline:accessPolicy` through ctx. Components register delivery handlers for their provider lifetime and submit stable operation IDs through `offline:enqueue`; `offline:flush` authorizes and delivers. The durable account-bound queue holds at most 1,000 records and 1 MB for seven days, without tokens. It preserves original IDs and timestamps, retries transient failures and removes acknowledged or permanently rejected records. A localized warning reports rejected records. Logout clears the account queue; changing accounts never replays another account’s data. Disabling Offline Mode stops new queued writes. Pending writes may still deliver online.

Recovery refreshes providers and runs `authenticate-session` before the final `afterSession` stage can replay activity. Required providers declare `offlineAccessGuard` in the server catalog. Unknown requirements or missing consent fail closed. Terms of Service caches the latest fetched document versions and server-confirmed acceptance per account. A new unaccepted version immediately blocks offline reads, navigation and queued writes, and prevents replay until online consent succeeds. Offline acceptance is unavailable. Private content snapshots remain tab-local; only the bounded operation queue and legal snapshots survive reload. The initial `beforeSession` stage clears prior delivery verification before each authentication pass.

## Offline Social Changes

Profile and Messages providers now register lifecycle-scoped HTTP actions through ctx. Previously loaded profiles, posts, room lists and encrypted threads remain available in the verified tab. Profile text, availability, follow/block state, banner layout, post creation/deletion, existing-room encrypted messages, final reaction states and read receipts use the account-bound offline buffer. Later online edits wait behind buffered edits from the same owner. Account or session changes during preparation or buffer waits cancel the action. Message/post creation uses stable `operationId` UUIDs; changed or cross-account retries are rejected, and message replay does not repeat notifications. Read receipts retain the original read time.

Chat is encrypted before buffering: plaintext, room keys and credentials are never added to the queue. Profile text and post content are stored in browser storage for the current account. Avatar/banner uploads up to 350,000 binary bytes may share the existing 1 MB/1,000-record/seven-day queue; larger images require connectivity. A full buffer reports a localized error; message and post drafts are cleared only after durable submission succeeds. These limits apply to the complete buffer, not each component separately.

Queued changes remain pending until server acknowledgement. Messages show a queued status; profile/post/media actions use the standard queued toast. Browser close and reload trigger the native unsaved-changes confirmation whenever the current account has buffered records, including records owned by disabled providers. The warning clears after acknowledgement or explicit account cleanup. Browsers control the confirmation wording and may require user interaction before showing it. Pending records still survive reload; the warning protects unacknowledged work and does not discard it.

Cached social content remains tab-local and consent-gated. First visits, private offline reloads, creating rooms, membership/key management, calls and large uploads require connectivity. Typing and presence are transient and are not replayed. Current server authorization is checked on replay; offline snapshots cannot reveal remote revocations. ToS consent is still mandatory before access and replay.

## Visible Online Icons

The Modules toolbar now keeps its icon dimensions when shared button styles load afterward. Correctly fetched refresh/settings SVGs are no longer squeezed to a narrow strip by button padding.

## Profile Startup

Profile availability starts from the provider mount after its buffered client has been registered and avatar styles are ready. Importing the provider does not start presence callbacks or polling. Disable and failed mounts remove subscriptions, page listeners, timers and cached availability; stale asynchronous work cannot update a later provider scope. This prevents online administration pages from raising `profile_client_unavailable` during initialization.

## Signup and Search

Every authenticated session checks `/api/v1/auth/setup-status`, including sessions restored after an SSO redirect. The notification owner contributes required email setup through `auth:getSetupIntegrations(accountId, role)`, returning same-origin setup scripts that export `enforceSetup({ accountId })`. Setup finishes before the session is approved for navigation or offline use. SMTP delivery outages do not waive required verification; the initial founder administrator remains exempt.

SMTP verification applies to SSO accounts as well as native accounts. Resending uses the configured notification delivery service. Codes and one-click links bind the complete account ID and email as an opaque tuple, including namespaced SSO IDs. Cancelling verification from Settings preserves the existing email address.

Administration stores Allow Public Native Registration independently of the registration adapter. Keep the public adapter enabled and turn native signup off to allow SSO account provisioning without allowing public username/password signup. Disabling the adapter also disables that provisioning path; invitation tokens remain available through their own adapter. Global search streams partial results, cancels replaced queries and bounds provider execution. Documentation titles appear before content; four cancellable workers index document bodies instead of fetching the entire library at once.

## Connection and Accounts

Offline worker policy and route metadata use a separate control cache. Catalog requests coalesce, policy changes keep their order, messages close their ports, and background asset cleanup cannot delay acknowledgements. Installation uses at most four concurrent asset requests. Login schedules public-cache maintenance without waiting for it and shows the shared loading wheel during credential, TFA-code and SSO authorization requests. Required interactive setup remains usable. Reachability checks use a fast liveness response; detailed component probes remain at `/api/v1/system/health`.

Public SSO profile handles omit provider namespaces. Existing provider-prefixed public handles are replaced at profile initialization, and collisions receive a random suffix. Existing provider-neutral handles remain stable. Account IDs, identity mappings, posts and relationships are unchanged. Public profile URLs change when their handles change. Provider metadata and email/login details remain in the administrator-only Users interface, whose per-account disclosures use the shared collapsible section styles and fetch authorized metadata when opened.

Administrators and owners can open `/invite` without founder status. Invitation policy still controls issuance. The enabled Registration Token adapter contributes `cognisctl invite:token:generate` to create a standalone token without SMTP delivery, and `cognisctl invite:email:send person@example.com` to send an invitation. Omitting the email opens the CLI input wizard. Both commands use the authenticated registration API and respect role, domain and delivery restrictions.

## User List Layout

Users fills the available composer width. Each account is a complete collapsible row with identity, role, status and management controls in its header; expanded metadata spans the row beneath it. Details use a responsive label-and-value grid, localized role and provider names, and separate email rows with primary and verification badges. Small screens wrap header controls and show metadata in one column.

## Account privacy and keyring isolation

SSO accounts use opaque random IDs. Provider IDs are stored separately and exposed only to administrators; public usernames never include them. Auth reserves usernames before profile or email side effects: duplicate names within one provider are rejected, while different providers receive a short random suffix when needed. Users lists and action endpoints distinguish public `username` from internal `accountId`.

This is a clean break with no account-ID migration. Stop the instance and reset databases containing provider-bearing SSO account IDs before upgrading; Authentication refuses startup with `provider_account_ids_require_clean_database` rather than serve those IDs. Existing relationships and meetings are not migrated.

Encrypted browser vaults are cached independently by origin, account ID and server account-instance ID. The server must verify the account and instance before a cache is loaded. Passwords and decryption keys remain in memory and are never persisted; old IndexedDB unlock keys are retired. Reloading requires the keyring password again, unless a password login successfully decrypts the vault. Account changes cancel outstanding prompts and cryptographic work. Unlock never creates a missing keyring: only explicit setup or Create can do so.

Account privacy and keyring isolation implementation: `015e99106e7c190b999e55e73d413257fcb41725`.

## Preserve local-account startup

Existing local accounts continue to work when legacy SSO records are present. Startup does not require a database reset. Legacy SSO sign-in and provisioning are rejected individually until those accounts are recreated with opaque IDs. No account IDs, relationships or meetings are migrated or deleted automatically.

Local-account startup correction: `894e74060ef7ff67fce1e8d45d94863ad5abd4a7`.

## Offline status and navigation recovery

One persistent header notice uses the shared callout styles to show “You are in offline mode”. On reconnection it offers Refresh instead of reloading automatically; refresh respects unsaved-change and buffered-write guards. An unavailable page first restores the previous usable page. If restoration fails, it arms guarded automatic refresh on reconnection. Same-origin absolute and relative links use the SPA router, and the offline catalog retains both cached public pages and provider-authorized private routes.

## Offline polling limits

Offline Mode stops consent polling and ordinary recovery polling. Only one lightweight server health probe runs every fifteen minutes, even after repeated browser online events. Online connection-recovery failures back off to fifteen minutes. Consent polling backs off after failures to five minutes, stops entirely offline, and resumes after reconnection. Required cached legal acceptance still gates offline access.

Offline status, navigation recovery and polling implementation: `b889c1fd03d733da95b11af0bff65c7bb590b679`.

## Sudden connection loss

When the active page cannot run offline, the host aborts its page lifecycle and quietly tries the previous offline-capable page. If that fails, the header notice explains the unavailable page and its content is cleared and guarded automatic refresh is armed for reconnection. Presence timers stop offline and restart on recovery. Successfully loaded public translation bundles are reused in the tab; protected catalogs still require authenticated requests.

## Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity. Reopening a shell no longer writes a theme preference automatically. Explicit UI preference changes use the active Profile client so they can enter its offline buffer, with account checks around delayed merges.

Implementation: [f05ea0a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f05ea0a48325a7a1e58ea22ca46c613f7cd85b87)

## One offline notice

Offline status and unavailable-page details share a single header notice without a Dismiss action. Reconnection replaces it with the connection-restored message and one Refresh button using shared button variants and action spacing. Shell defaults preserve explicit confirm, cancel and neutral button styles. Pages without a shell header use one inline notice.

Implementation: [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)

## Offline assets and Calendar

Production asset resolution now traverses arrays, including route capability scripts and stylesheets. Versioned and unversioned public asset URLs share worker cache keys while module revision boundaries remain intact. Supported page code and inactive styles prepare in two background workers without mounting pages. Offline links require prepared code and their owner’s required account/session snapshots; navbar redraws preserve disabled state, so Meetings remains disabled. Private APIs and authenticated HTML remain outside the worker cache.

Calendar snapshots its calendar list, invitations and owned-event lists after verified authentication, with two background requests at a time. Cache invalidation refreshes those snapshots without blocking login. Cached events remain readable; event creation, edits, deletions, responses, status preferences and calendar edits enter the shared durable outbox. Pending creations and edits appear in cached event lists. Creation uses a stable operation UUID; a replay returns the existing event without another recurrence series or repeated invitation dispatch, and changed or cross-account reuse conflicts. Server authorization is checked on replay.

Calendar snapshots are tab-local and bounded to 4 MB/100 reads. The global outbox remains bounded to 1 MB/1,000 records/seven days. New recurring events show their first occurrence until server expansion. Creating calendar containers, generating meetings, share/password management and guest credentials require connectivity; share passwords are never buffered. Messages requires a cached room list and Study requires cached language/preference metadata before enabling offline navigation.

After verified authentication, Study prepares language catalogs, preferences and selected-language module links in the background, with at most two module requests at a time. Sub-navigation uses the same owner cache, so the first visit to the hub can happen offline. Cache invalidation schedules preparation again without blocking login.

## Login and queued delivery

Successful password and TFA login use the existing SPA navigation capability to replace the login page with Dashboard. Login therefore keeps the verified tab and buffered work alive without invoking the browser’s page-close warning. Loading remains visible until navigation finishes; optional timezone synchronization runs afterward and rejects account switches. The warning still protects actual buffered changes when closing or reloading an authenticated tab.

Outbox replay starts in the background only after successful session authorization and required consent. A separate browser delivery lock serializes replay across tabs; short storage locks protect snapshots and acknowledgements without waiting for network delivery. Reads and new queued writes remain usable during a slow replay, and acknowledgements re-read storage so concurrent writes survive. Empty queues are not rewritten during authentication; unauthenticated pages do not warn about another account’s buffer.

## Offline checks and warnings

The Offline Mode banner offers Recheck Connectivity with shared button styling and a busy state. It immediately calls `/api/v1/system/healthcheck`, coalesces simultaneous checks, then reauthorizes the session and attempts queued delivery when the server is reachable. Required consent still gates replay. Failure keeps Offline Mode active without an error popup. Automatic checks remain limited to once every fifteen minutes; this explicit action can run sooner. Refresh remains available after recovery.

Background analytics stays queued but does not arm the browser close warning. Owners opt out with `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; the default remains true for user changes, and each new record stores its classification so provider disposal or reload cannot turn telemetry into an unsaved edit. Older records use an active owner’s declaration, with unknown owners protected. Automatic detected-timezone synchronization uses `saveUiPreferences(patch, { bufferOffline: false })`; the scoped HTTP client rejects that operation offline instead of queueing it. Explicit preference changes, messages and Calendar edits still buffer and warn.

## Commits

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
- [39bc5c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/39bc5c3c81a7b87b096d8ed665aa3ddeee7e4c93)
- [5cfeb11](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cfeb11f0684d87760f8cc697bd42df4fcdd72b9)
- [f9e9412](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9e94123bf209c424d03113bd35a4b6eb307163f)
- [7fe3dfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/7fe3dfe17d68047602ae510a892503e7f0bbdc5e)
- [09ca5a5](https://github.com/Cognis-Labs-HQ/Cognis/commit/09ca5a58239ff2a21195d9b3f8d755c64753d977)
- [950309c](https://github.com/Cognis-Labs-HQ/Cognis/commit/950309c0c732d732f3558c8f153b697214378cc2)
- [5e3abf8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e3abf80c5046e5e9f783ce8900f84506cac817f)
- [a087357](https://github.com/Cognis-Labs-HQ/Cognis/commit/a087357f0eed1acfa938fa449c92ea5fd7ef63b3)
- [9ddc4fb](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ddc4fb3086075e50448928439eb30d543a3dd0d)
- [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)
- [da5a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/da5a324b48014feab2905dfc8a69a2cab4dd3599)
- [d895d67](https://github.com/Cognis-Labs-HQ/Cognis/commit/d895d67d17cdc3888f665a5ea06395fe746d2e2b)
