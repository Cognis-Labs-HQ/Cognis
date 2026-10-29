# Offline Navigation

**Feature Branch:** feature-offline-navigation

## Live UI Language Changes

The language shortcut cycles only through enabled UI languages and applies the last choice after two seconds through the staged `ui:languageCatalog:select` and `ui:redraw` flows. The browser document, URL, history and private offline caches remain intact. Unsaved edits retain their navigation guard; stale work and failed mounts cannot commit a different locale. Selection is tab-local and scoped to the active account/session, without changing configured language membership or order. Settings keeps Save/Discard: saved priority changes use the same two-second redraw. Offline, Available is locked and cross-table moves and browser synchronization are blocked; Selected can still be reordered and saved through the normal preference buffer. Core/public component strings are prepared for enabled locales, English remains the per-key fallback, and genuinely missing keys still fail. The worker boot set includes all host component locale XML and language flag SVGs so unvisited prepared pages can redraw offline. Reused shell and contributed core navigation labels retranslate without tearing down providers. Language-switch timers are disposed with their page or replacement binding.

## Visible Offline Destinations

Unavailable destinations stay visible with the same disabled styling in the primary navigation, user dropdown and Study submenu. Library and its management/request links remain listed but disabled offline and reactivate after reconnection. Study permissions still control which entries exist. Disabled links do not load routes or open recovery feedback, including Study’s stateful language/settings navigation. Cached Explore and Flashcards remain accessible.

## Consistent Offline Feedback

Offline saves keep the same success messages and variants as connected saves. Messages, posts, image uploads and email changes do not add queue-specific notices, and message receipts use their normal presentation. Real persistence failures and rejected changes remain visible. The shared warning banner uses semantic light/dark palettes for its opaque amber surface, text, border, controls and restrained striped accent; Offline Mode no longer injects its own background styling. Collapse animation, keyboard expansion and reduced-motion support remain available.

## Atomic Marketplace Refresh

Marketplace refreshes prepare detached module records and finish loading their own locale bundles before replacing the visible catalog. Updating one module can redraw safely while another module’s translations are pending; tags resolve from their owning module rather than the host bundle. A missing translation still fails explicitly and leaves the last complete catalog visible. Lifecycle actions invalidate older refreshes, and periodic polling pauses while lifecycle or dependency checks are pending. Catalog metadata retains its matching locale bundle when installed metadata differs.

## Smooth Recovery and Navigation

The offline notice uses a narrow orange-and-white stripe above an opaque themed surface. Collapsible banners animate their clipped wrapper height and content opacity while retaining their natural document space; keyboard expansion remains available, and reduced-motion preferences disable the transitions. Public assets, including the boot-prepared web manifest, can use the cache before private consent is accepted; private documents and API data retain their existing authorization gates. Explicitly disabling Offline Mode still uses the network. Individual resource failures require a failed health probe before announcing Offline Mode, and the worker stops probing after confirmation until recovery refreshes its catalog. Study navigation uses verified session snapshots immediately, with coalesced validation at most once per thirty seconds. Cold metadata requests are bounded to five seconds; optional dictionary discovery stops after three seconds. Authoritative read denials invalidate snapshots, enrollment/module changes invalidate navigation data, and failed sub-page discovery can retry.

## Configurable Top Banners

The `ui:broadcast.publish` descriptor accepts a CSS `background` color or gradient and a boolean `collapsible` flag, which defaults to false. Invalid descriptor types and declaration-breaking background values are rejected. A collapsible banner shrinks to a 2px patterned strip while scrolling down, expands while scrolling up and remains keyboard-focusable; hover or keyboard focus reveals its content and actions. The stack reserves its expanded document space to prevent scroll-anchor jumps, and its visible height offsets the sticky header and sidebar. Non-collapsible banners remain fully visible. Removing the last banner releases observers, scroll listeners and layout offsets. Offline Mode uses an orange-and-white warning pattern and opts into collapse; recovery keeps the guarded Refresh action.

## Offline Personal Settings

Verified sign-in prepares the account’s email list and trusted-domain policy without opening Settings. Email additions, removals and primary-address changes are projected locally and queued through `notify:emailClient` and the protected `notify.emails` outbox owner. Server validation remains authoritative. Email verification, resend and account lifecycle actions require connectivity; no codes, watch tokens or passwords enter the queue. Queued additions remain unverified until online verification. Successful delivery refreshes the email snapshot; optional refresh failure cannot turn a persisted write into a failed action. These bounded private snapshots remain tab/session-scoped.

## Prepared Flashcards

Flashcards prepares every visible deck in enrolled learning or teaching languages, with two workers and no 80-deck cutoff. The dedicated cache is bounded to 64 MB and 10,001 reads so the gallery and ordinary deck collections fit together; larger collections remain subject to that limit. Non-enrolled languages are excluded. The shared schema catalog prepares even without enrollment, and missing optional Library collections do not prevent a prepared deck from entering practice.

## Offline Orbitron

Orbitron is bundled from Google Fonts as a 400–900 variable font under the SIL Open Font License in `src/ui/styles/fonts/OFL.txt`. Its stylesheet and font file enter the public worker preparation set before an offline transition. Cached public assets are used first online and offline; the existing coalesced background revalidation keeps mutable assets current. Orbitron does not depend on a Google request at runtime. Other optional Google fonts load separately and cannot delay the local font.

## Banner Background

Shared top banners retain an opaque, theme-aware background while scrolling. Restored-connection, warning and danger notices use the existing theme colors.

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

The native close/reload guard covers protected records newly created in the current page and session. A real reload starts with that guard clear while preserving queued records for replay; new meaningful edits arm it again. Viewed Study markers and analytics are background activity and do not arm it. Other tabs’ records, previously persisted records and merely rendering pages do not create a warning. Provider disposal keeps current-page edits protected until delivery or removal.

## Refresh unlocks and module loading

Unlocks survive refreshes in the same authenticated tab/session. The password still encrypts the vault; neither a password nor a plaintext decryption key is persisted. Session storage holds only an AES-GCM encrypted unlock, wrapped using HKDF from the active session secret and bound to origin, account, server account-instance and session identity. The server must verify that binding before restoration. Finite relock deadlines are authenticated and remain absolute across refreshes. Explicit Lock, logout, account/instance/session changes and expiry invalidate restoration. Closing the tab or starting a new session requires unlocking again. The retired plaintext IndexedDB cache remains disabled.

Host route-asset preparation registers its flow and cache capabilities once per shared ctx. Bundled scripts and source imports from external modules reuse the same registrations and prepared-route state, so opening Meetings no longer fails with a duplicate `offline:prepareRouteAssets` flow.

## Shared top banners

The host exposes `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` before providers or pages mount. Descriptors accept a plain-text `title`, sanitized `bodyHtml`, trusted `actionsHtml` and an `info`, `success`, `warning` or `danger` variant. The returned handle has `element` and `remove()`. Reusing an ID replaces only that owner’s notice; an older disposer cannot remove its replacement. Bind provider/page lifetimes with `signal`. Lower priorities appear first. Titles are escaped; callers must sanitize rich text.

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

After Save completes, the scheduled redraw still checks for newer unsaved edits. Edits made during the two-second delay retain their discard confirmation; repeated saves coalesce, and leaving Settings cancels pending redraws.

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
- [b90e0cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b90e0cda258130cc9b30db1f8c388385cdce4e1b)
- [dde15f4](https://github.com/Cognis-Labs-HQ/Cognis/commit/dde15f4c898abb129a31228e0894272f0366f811)
- [f6b4ede](https://github.com/Cognis-Labs-HQ/Cognis/commit/f6b4ede722b7a14cfe67f2eb758670bc28071fb3)
- [341087c](https://github.com/Cognis-Labs-HQ/Cognis/commit/341087c11a97fa9cfdd578beffa9761cffcbf9db)
- [d203bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d203bf0cdc967809fc9adb9aad37b373d3c1620d)
- [be70890](https://github.com/Cognis-Labs-HQ/Cognis/commit/be708903dd542514d8cd16f5e2651341e1c60dbc)
- [1118229](https://github.com/Cognis-Labs-HQ/Cognis/commit/1118229c6cb20351d6cb86282427e0ce3d96058b)
- [070f1b7](https://github.com/Cognis-Labs-HQ/Cognis/commit/070f1b7bf2e1d6ac2dfb1b58b1f50103adb72fb9)
- [b38bc93](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38bc93e45e269ae465e33e700110e116668f5df)
- [41b573b](https://github.com/Cognis-Labs-HQ/Cognis/commit/41b573b56b646acaf3f9bb9064ca6211c6657e92)
- [bb3fbfd](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb3fbfd7ea7e3cf4f021c2a3cafab7f58bc7fe2c)
- [b10ab85](https://github.com/Cognis-Labs-HQ/Cognis/commit/b10ab85f93ee48a37fb1b13152a14686db2ae2eb)
- [a2f8c21](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2f8c21bf2a8f51ef30bf73ef88e0782b249117e)
- [a69a4d0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a69a4d002da076c34d6805253dd4346d17990faa)
- [642306f](https://github.com/Cognis-Labs-HQ/Cognis/commit/642306f1981c47272c064990ee49ef132049c825)
- [2c37184](https://github.com/Cognis-Labs-HQ/Cognis/commit/2c37184bff7e8d12730df57d00f1d533e34988b4)
- [3f62928](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f6292879d733012546c2f1b37195ea58dbe8504)
- [2a7180a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2a7180a48bd789fc0151df12128e25027cce1b88)
