# Study navigation

Study pages share one composer sub-navigation slot, resolve common navigation/action labels from ui.reuse in all four languages, and retain current route selection at rendering time. Cancelled router scopes stay cancelled when replaced. Image-preview failures show a localized error toast and release the open-state lock so another attempt is possible.

Drawing progress retains every delivered attempt ID alongside its count, so retrying A after B and after restart cannot increment guidance difficulty again. The same validated progress and reward integrations remain active.

Flashcards uses `/study/<iso>/flashcards` and `/study/<iso>/flashcards/<deck-id>`. The sub-navigation language controls select the corresponding gallery; a deck from another language is not carried across. `/study/flashcards` resolves the current language. Library and Requests remain shared pages.

## Usage examples

Open `/study/ja/flashcards` to browse Japanese decks; selecting English opens `/study/en/flashcards`.

## Technical specification

Language-scoped galleries resolve the selected language from the path and filter visible decks through the Study public contract. A deck detail URL identifies its language and deck UUID; changing language returns to its gallery. Navigation does not carry transient query data.

Study uses the localized `navigationLabels` supplied by active adapter route descriptors for adapter-owned links, including Requests. It does not resolve their label keys through the gateway locale bundle. Labels select the exact UI locale, its base language, then English; Study-owned links continue to use the gateway XML resources.

## Keep drawing frames consistent

Floating drawing pads open in a large frame independent of the current word or pattern aspect ratio. Switching cards preserves the position and any manual resizing; drawings retain their proportions inside the canvas.

## Guide the whole pattern consistently

Before the first input, an uncompleted pattern shows every stroke. After input begins, only the next stroke is guided across every character boundary. Previously completed patterns start with next-stroke guidance and retain hidden-stroke knowledge tests and the reveal action.

## Remember drawing progress

Drawing completion and the number of strokes to hide are stored per account and card through the preference store. Each attempt, reset, and retry samples fresh distinct positions from that count. A successful completion with at most one mistake increases the count by one, capped to the current stroke count. Completed patterns keep next-stroke guidance, while uncompleted patterns preview the whole pattern before input. Authenticated GET and POST requests to `/api/v1/study/drawing/:cardId` run through the `study:drawing:readProgress` and `study:drawing:complete` flows; the browser never supplies an account identity.

The final accepted stroke immediately saves completion and the next difficulty. Closing the pad or leaving Explore does not cancel that save. Reopening the same card and retrying wait for the saved progress before selecting hidden strokes.

## Conceal writing answers

The drawing heading initially shows a masked character and a standard click-to-reveal button. Loading a different character masks it again. Floating sessions expose their current card through the removable `study:drawing:observe` capability. The matching Library preview stays open, blurred and non-interactive until the pad changes character or closes; pronunciation and meaning remain available in the pad. Embedded Writing uses the same concealment and reports reveals as assisted attempts.

## Saved Study Controls

The dictionary provider selector uses theme-select and is hidden for a single provider. Settings follows the dictionary search input. KANJIDIC2 supplies kanji enrichment rather than a search option alongside Jisho; named reference sources identify their actual catalog.

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. Writing headings blur a same-size masked glyph; the first click reveals it and enables its Explore deep link. A second click offers navigation confirmation. Keyboard activation follows the same interaction.

## Drawing Pad Navigation

Opening the drawing pad from card details closes the detail popup after the pad opens successfully. The concealed pad heading still reveals on the first click. Clicking the revealed heading on Explore opens the card directly; other Study pages retain the confirmation before navigating to Explore.

Flashcard answer choices are standalone answer buttons. Card headings and revealed answers use in-app actions that retain departure confirmation and deck order without exposing card URLs on hover. Within Explore, the revealed drawing heading uses an action without a URL; its second click opens the card directly.

Writing practice uses only the drawing pad’s masked heading. Previous/next SVG arrows sit above the pad alongside the favourite control; next remains gated by an answer. Flashcards passes `suppressRetry: true` to the shared drawing pad, hiding and disabling its retry action; standalone practice keeps retry enabled by default.

Embedded consumers may supply `onNavigate(card)` after the shared heading confirmation. Flashcards uses it to settle the current attempt through its departure flow and preserve the deck navigation context before opening Explore.

## Extensible Browser Actions

Library browser clients resolve `study:library:client` through ctx. Its provider registers `study:library:<clientFunction>` with `before`, `execute` and `after` stages for reads, dictionary work, requests, imports and media. Required route capabilities load the provider before mounting. See the Library adapter documentation for extension arguments, vetoes and teardown behavior.

## Honor Study Authentication

Study requires the Authentication gateway and its `auth:routeContext` capability before registering routes. Adapter administration, language discovery and drawing routes use the injected context, including custom guards. Missing authentication contracts fail bootstrap instead of selecting a default guard.

## Uniform Practice Sampling

Drawing guidance and Flashcard answer shuffling share the `randomIndex` helper. It uses Web Crypto with masked rejection sampling, supporting integer ranges from 1 through 2^32 without modulo bias. Single-position ranges need no entropy. The caller may inject an entropy source for deterministic testing; normal practice always uses Web Crypto.

## Component isolation and lifecycle

The API delegates extension namespaces through active gateway-owned policies; Study owns the language namespace rules. Library provider capabilities withdraw when the adapter or its Study dependencies are disabled, reject retained handles, and return when enabled. Study adapter bootstrap exposes `onAvailabilityChange(listener)` for lifecycle-bound contributions; failed bootstrap withdraws them.

## Offline Study

Offline Mode is enabled by default in Settings. Turning it off restores the existing connection warning and error behavior and disables worker fallback. With it enabled, connection loss quietly enters offline mode; unavailable navigation is blocked without an error popup.

Study keeps bounded lightweight JSON snapshots in the current tab: schemas, permitted character/card data, locations, viewed IDs, favourites and previously opened decks. Language schemas opt in with `metadata.offline: { cache: "lightweight" }`. The Library cache holds at most 16 MB and 100 reads; other read caches hold at most 4 MB and 100 reads. No audio bytes, dictionary responses, credentials or authenticated documents are persisted.

Explore previews resolve relationships from already-authorized cached rows. Drawing and flashcard practice work locally. Completions, reviews, viewed IDs and final favourite states are queued for delivery; progress, XP and rewards become authoritative only after server acknowledgement. Audio and dictionary/ElevenLabs requests stop. Content edits, deletion and sharing require connectivity. Only previously loaded content within the cache limits is available.

Private Study requires the same previously verified, unexpired account session in the same tab. Private offline reloads require connectivity; a first hub visit in the verified tab works after background preparation. Account/session changes, preference changes, module lifecycle changes and provider disposal invalidate private snapshots. Server revocations cannot be learned while disconnected. Recovery uses the existing unsaved-change guard and reloads to refresh server authorization.

## Queued Delivery and Consent

The host exposes `offline:outbox`, `offline:state` and `offline:accessPolicy` through ctx. Components register delivery handlers for their provider lifetime and submit stable operation IDs through `offline:enqueue`; `offline:flush` authorizes and delivers. The durable account-bound queue holds at most 1,000 records and 1 MB for seven days, without tokens. It preserves original IDs and timestamps, retries transient failures and removes acknowledged or permanently rejected records. A localized warning reports rejected records. Logout clears the account queue; changing accounts never replays another account’s data. Disabling Offline Mode stops new queued writes. Pending writes may still deliver online.

Recovery refreshes providers and runs `authenticate-session` before the final `afterSession` stage can replay activity. Required providers declare `offlineAccessGuard` in the server catalog. Unknown requirements or missing consent fail closed. Terms of Service caches the latest fetched document versions and server-confirmed acceptance per account. A new unaccepted version immediately blocks offline reads, navigation and queued writes, and prevents replay until online consent succeeds. Offline acceptance is unavailable. Private content snapshots remain tab-local; only the bounded operation queue and legal snapshots survive reload. The initial `beforeSession` stage clears prior delivery verification before each authentication pass.

## Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity.

## Empty offline Study pages

Prepared Study pages remain navigable in a verified, consented offline session even without private content snapshots. Missing language/preference metadata produces empty navigation data. Explore mounts its normal empty browser and shows “No offline cached content available” instead of route-unavailable feedback or error toasts. Flashcards also retains an empty page when deck data or a required view resource is missing. Notices are scoped to the current page and deduplicated. Cache misses do not conceal access or consent denials. Library and flashcard providers prepare their public translations and light templates online; private data stays in the bounded tab-local caches.

## Offline Study Assets

Study prepares its lazy popup icons, drawing template, drawing styles and close icons while online, without mounting the drawing pad or blocking login. Preparation retries after recovery and stops with its provider. Previously cached characters can open the pad for the first time offline. Content editing is unavailable offline; an open detail popup disables Edit when connectivity is lost. Missing decorative popup icons retain their translated action label instead of opening a resource-error dialog.

## Offline Availability

The offline route registry survives repeated bundled and directly served imports. Prepared route descriptors retain availability when reconstructed with the same script, styles and capability providers; changed assets require preparation again. Messages prepares its room list, translations and emoji catalogs after verified sign-in. The page can open offline before its first online visit; only cached rooms with cached threads open automatically, and selecting an uncached thread gives a targeted information toast. Explore keeps available cached collections when another collection or viewed-marker snapshot is missing. Access and consent denials still propagate. Banner actions sit directly in the shared action row, removing the inherited vertical offset.

## Shared Study Favourites

The Study provider exposes `study:favourites` with scoped `load`, `toggle` and `has` operations. Rendering utilities resolve this ctx capability instead of keeping a separate cache for each loader. Favourites prepare after verified authentication, overlay pending changes and share account/session-bound state across Explore, flashcards and repeated imports. Missing optional favourite snapshots produce an empty selection with queued changes applied; they do not hide cached content or show an update-failed toast. Account changes clear the visible selection and access denials are never treated as cache misses.
