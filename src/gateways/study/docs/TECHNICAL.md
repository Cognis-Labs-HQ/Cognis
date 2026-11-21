# Technical Reference

The public interfaces and operational rules of Study.

## Interfaces

### Audio provider contract

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Both Study modules expose the same removable audio-provider contract and retrieve bundled recordings with bounded local reads. The host owns authorization, cache policy and composite playback.

Seed recordings use the offline Kokoro multilingual neural model with the English `bf_emma` and Japanese `jf_alpha` voices. Clips are encoded at 128 kbps with a 200 ms lead-in, a 180 ms tail, bounded peak normalization and slower speech. Model attribution and Apache licensing are recorded in `data/audio/VOICE-LICENSE.txt`; the recording inventory records the voice and processing settings.

Audio retrieval begins only when the learner requests playback. Merely opening a card makes no audio request. Playback failures use the host localized toast and structured logs. Sentence constituents retain their selected transformation descriptors; the authenticated audio endpoint derives the spoken form from the schema rather than accepting arbitrary display text. English letter-combination seed clips are synthesized from their authored IPA phonemes, while alphabet clips speak letter names.

## Configuration

Configuration is supplied through the owning gateway. Study declares no additional configuration in its manifest.

## Behavior

### Pronunciation audio

Bootstrap requires `study:audio:provider` and registers one removable audio provider alongside dictionary and stroke providers. It resolves module-bundled recordings by spoken label and preferred reading, with bounded file reads and explicit missing-audio errors. Removal aborts pending retrieval. Cognis authorizes card access, derives selected transformation text from the schema, and caches recordings privately through Files without modifying authored fields. The `study:library:audio` flow executes authorization, validation and resolution; `study:audio:fetch` validates and retrieves provider bytes. Sentence audio remains ordered constituent playback.

### Dictionary audio and host caching

When a requested pronunciation is not bundled, English Study retrieves the word from the English Dictionary API and downloads a matching MP3 from its pronunciation media endpoint. A preferred IPA reading must match; a different pronunciation is never substituted. Only HTTPS media on `api.dictionaryapi.dev` is accepted, redirects are rejected, lookup and download share one deadline, and both responses have streaming byte limits. Missing recordings remain explicit errors. No Google speech service is used.

Cognis owns the recording cache, not the module. After authorization, its private Files cache reuses successful recordings across cards and restarts. Concurrent playback requests share retrieval and persistence. Keys include provider identity, revision, language, role, label and readings; a changed reading or provider revision resolves independently. Failed requests or writes remain retryable. The module contacts the dictionary only on a cache miss when playback is requested.

### Paced composition and replacement

An audio field is optional on sentence cards. On first playback Cognis authorizes every constituent, selects only the first pronunciation group, applies selected transformations, and creates one continuous WAV with a quiet lead-in and deliberate word, comma and sentence pauses. The generated recording is cached privately; constituent bytes, reading changes, transformations and pacing affect its identity. It is generated on demand for new cards as well as existing cards. Uploading an audio file in the normal composer replaces generated playback immediately. Removing that explicit file restores automatic composition. Providers supply lexical clips; Cognis owns composition and cache policy.

### Preserve transformed sentence audio

Sentence composition requests the selected transformed label and primary reading, including chained paths. If a variant recording is unavailable, playback fails explicitly instead of traversing base-form pronunciation references. The same rule applies to direct variant playback and nested constituents.

### Usage

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

`POST /api/v1/study/library/entries/deletion-plan`

### Study navigation

Study pages share one composer sub-navigation slot, resolve common navigation/action labels from ui.reuse in all four languages, and retain current route selection at rendering time. Cancelled router scopes stay cancelled when replaced. Image-preview failures show a localized error toast and release the open-state lock so another attempt is possible.

Drawing progress retains every delivered attempt ID alongside its count, so retrying A after B and after restart cannot increment guidance difficulty again. The same validated progress and reward integrations remain active.

Flashcards uses `/study/<iso>/flashcards` and `/study/<iso>/flashcards/<deck-id>`. The sub-navigation language controls select the corresponding gallery; a deck from another language is not carried across. `/study/flashcards` resolves the current language. Library and Requests remain shared pages.

### Compact Navigation

On phones and tablets, Study page links use a horizontally scrollable row and reveal the selected page after resizing or font changes. Language, dictionary search and settings share the next row. The search icon opens a dialog that retains the original form, selected provider and draft. Closing restores focus; navigation or a resize to desktop closes the dialog. The overview uses document scrolling. While scrolling, the compact header keeps primary navigation available and folds the brand row.

Language names shorten to their language code and then their flag when the available space is tight. The full language name remains the accessible label and tooltip. Languages without a flag retain their code. More space restores the full names.

### Usage examples

Open `/study/ja/flashcards` to browse Japanese decks; selecting English opens `/study/en/flashcards`.

### Keep drawing frames consistent

Floating drawing pads open in a large frame independent of the current word or pattern aspect ratio. Switching cards preserves the position and any manual resizing; drawings retain their proportions inside the canvas.

### Remember drawing progress

Drawing completion and the number of strokes to hide are stored per account and card through the preference store. Each attempt, reset, and retry samples fresh distinct positions from that count. A successful completion with at most one mistake increases the count by one, capped to the current stroke count. Completed patterns keep next-stroke guidance, while uncompleted patterns preview the whole pattern before input. Authenticated GET and POST requests to `/api/v1/study/drawing/:cardId` run through the `study:drawing:readProgress` and `study:drawing:complete` flows; the browser never supplies an account identity.

The final accepted stroke immediately saves completion and the next difficulty. Closing the pad or leaving Explore does not cancel that save. Reopening the same card and retrying wait for the saved progress before selecting hidden strokes.

### Conceal writing answers

The drawing heading initially shows a masked character and a standard click-to-reveal button. Loading a different character masks it again. Floating sessions expose their current card through the removable `study:drawing:observe` capability. The matching Library preview stays open, blurred and non-interactive until the pad changes character or closes; pronunciation and meaning remain available in the pad. Embedded Writing uses the same concealment and reports reveals as assisted attempts.

### Saved Study Controls

The dictionary provider selector uses theme-select and is hidden for a single provider. Settings follows the dictionary search input. KANJIDIC2 supplies kanji enrichment rather than a search option alongside Jisho; named reference sources identify their actual catalog.

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. Writing headings blur a same-size masked glyph; the first click reveals it and enables its Explore deep link. A second click offers navigation confirmation. Keyboard activation follows the same interaction.

### Drawing Pad Navigation

Opening the drawing pad from card details closes the detail popup after the pad opens successfully. The concealed pad heading still reveals on the first click. Clicking the revealed heading on Explore opens the card directly; other Study pages retain the confirmation before navigating to Explore.

Flashcard answer choices are standalone answer buttons. Card headings and revealed answers use in-app actions that retain departure confirmation and deck order without exposing card URLs on hover. Within Explore, the revealed drawing heading uses an action without a URL; its second click opens the card directly.

Writing practice uses only the drawing pad’s masked heading. Previous/next SVG arrows sit above the pad alongside the favourite control; next remains gated by an answer. Flashcards passes `suppressRetry: true` to the shared drawing pad, hiding and disabling its retry action; standalone practice keeps retry enabled by default.

Embedded consumers may supply `onNavigate(card)` after the shared heading confirmation. Flashcards uses it to settle the current attempt through its departure flow and preserve the deck navigation context before opening Explore.

### Extensible Browser Actions

Library browser clients resolve `study:library:client` through ctx. Its provider registers `study:library:<clientFunction>` with `before`, `execute` and `after` stages for reads, dictionary work, requests, imports and media. Required route capabilities load the provider before mounting. See the Library adapter documentation for extension arguments, vetoes and teardown behavior.

### Uniform Practice Sampling

Drawing guidance and Flashcard answer shuffling share the `randomIndex` helper. It uses Web Crypto with masked rejection sampling, supporting integer ranges from 1 through 2^32 without modulo bias. Single-position ranges need no entropy. The caller may inject an entropy source for deterministic testing; normal practice always uses Web Crypto.

### Component isolation and lifecycle

The API delegates extension namespaces through active gateway-owned policies; Study owns the language namespace rules. Library provider capabilities withdraw when the adapter or its Study dependencies are disabled, reject retained handles, and return when enabled. Study adapter bootstrap exposes `onAvailabilityChange(listener)` for lifecycle-bound contributions; failed bootstrap withdraws them.

### Offline Study

Offline Mode is enabled by default in Settings. Turning it off restores the existing connection warning and error behavior and disables worker fallback. With it enabled, connection loss quietly enters offline mode; unavailable navigation is blocked without an error popup.

Study keeps bounded lightweight JSON snapshots in the current tab: schemas, permitted character/card data, locations, viewed IDs, favourites and opened decks. Language schemas opt in with `metadata.offline: { cache: "lightweight" }`. The Library cache holds at most 16 MB and 100 reads; other read caches hold at most 4 MB and 100 reads. No audio bytes, dictionary responses, credentials or authenticated documents are persisted.

Explore previews resolve relationships from already-authorized cached rows. Drawing and flashcard practice work locally. Completions, reviews, viewed IDs and final favourite states are queued for delivery; progress, XP and rewards become authoritative only after server acknowledgement. Audio and dictionary/ElevenLabs requests stop. Content edits, deletion and sharing require connectivity. Only loaded content within the cache limits is available.

Private Study requires the same verified, unexpired account session in the same tab. Private offline reloads require connectivity; a first hub visit in the verified tab works after background preparation. Account/session changes, preference changes, module lifecycle changes and provider disposal invalidate private snapshots. Server revocations cannot be learned while disconnected. Recovery uses the existing unsaved-change guard and reloads to refresh server authorization.

### Queued Delivery and Consent

The host exposes `offline:outbox`, `offline:state` and `offline:accessPolicy` through ctx. Components register delivery handlers for their provider lifetime and submit stable operation IDs through `offline:enqueue`; `offline:flush` authorizes and delivers. The durable account-bound queue holds at most 1,000 records and 1 MB for seven days, without tokens. It preserves original IDs and timestamps, retries transient failures and removes acknowledged or permanently rejected records. A localized warning reports rejected records. Logout clears the account queue; changing accounts never replays another account’s data. Disabling Offline Mode stops new queued writes. Pending writes may still deliver online.

Recovery refreshes providers and runs `authenticate-session` before the final `afterSession` stage can replay activity. Required providers declare `offlineAccessGuard` in the server catalog. Unknown requirements or missing consent fail closed. Terms of Service caches the latest fetched document versions and server-confirmed acceptance per account. A new unaccepted version immediately blocks offline reads, navigation and queued writes, and prevents replay until online consent succeeds. Offline acceptance is unavailable. Private content snapshots remain tab-local; only the bounded operation queue and legal snapshots survive reload. The initial `beforeSession` stage clears prior delivery verification before each authentication pass.

### Empty offline Study pages

See the [shared contract](/docs/api/technical) for this behavior.

### Offline Study Assets

Study prepares its lazy popup icons, drawing template, drawing styles and close icons while online, without mounting the drawing pad or blocking login. Preparation retries after recovery and stops with its provider. Previously cached characters can open the pad for the first time offline. Content editing is unavailable offline; an open detail popup disables Edit when connectivity is lost. Missing decorative popup icons retain their translated action label instead of opening a resource-error dialog.

### Offline Availability

See the [shared contract](/docs/api/technical) for this behavior.

### Shared Study Favourites

See the [shared contract](/docs/api/technical) for this behavior.

### Enrolled Offline Workspace

After verified sign-in, Study prepares schemas, readable locations, forms, viewed markers and opted-in lightweight collections for enrolled learning and teaching languages. Flashcards prepares its list and all visible matching decks with card details, within its existing bounded cache. Enrollment changes trigger preparation again. Two workers limit concurrent reads; provider disposal, account changes, access denial and cached legal consent remain enforced. Pages need no prior visit; private snapshots remain scoped to the verified tab/session.

### Offline Study Practice

Library management and its edit/search/request pages require a connection. The Study submenu retains those links but disables them offline, including immediately after disconnection; Explore remains available for cached browsing and drawing. The Library provider declares only Explore as an offline session route.

See the [shared contract](/docs/api/technical) for this behavior.

### Smooth Recovery and Navigation

Study navigation uses verified session snapshots immediately, with coalesced validation at most once per thirty seconds. Cold metadata requests are bounded to five seconds; optional dictionary discovery stops after three seconds. Authoritative read denials invalidate snapshots, enrollment/module changes invalidate navigation data, and failed sub-page discovery can retry.

### Visible Offline Destinations

Unavailable destinations stay visible with the same disabled styling in the primary navigation, user dropdown and Study submenu. Library and its management/request links remain listed but disabled offline and reactivate after reconnection. Study permissions still control which entries exist. Disabled links do not load routes or open recovery feedback, including Study’s stateful language/settings navigation. Cached Explore and Flashcards remain accessible.

### Acknowledged Favourites

See the [shared contract](/docs/api/technical) for this behavior.

## Security

### Honor Study Authentication

Study requires the Authentication gateway and its `auth:routeContext` capability before registering routes. Adapter administration, language discovery and drawing routes use the injected context, including custom guards. Missing authentication contracts fail bootstrap instead of selecting a default guard.

### Dashboard and Study access

Dashboard declares private session-only offline access and keeps its account summary and cached upcoming events usable. Optional server-fetched Dashboard extensions are skipped when reopening offline. The Study provider registers its hub route and uses account/session-bound snapshots for language catalogs, learning preferences and module links through `study:navigation` flows. Navbar loading warms the lightweight hub metadata. Explore and flashcards retain their provider-owned route declarations; unsupported pages still use the quiet fallback. Language enrollment controls require connectivity.

## Reference

### Reference inventory coverage

The Japanese reference catalog includes all 13,108 characters in the packaged official KANJIDIC2 snapshot. The English catalog includes all 135,969 Open English WordNet lexical entries (127,311 normalized keys). These are separate lazy dictionary providers, not 149,077 eagerly imported seed cards. Choose Reference Dictionary in Study search to import supported entries through the normal graph validation. Source records without meanings or usable readings remain unknown; no pronunciation, translation or stroke diagram is fabricated. This inventory is not all Unicode Han and is not a claim to enumerate every possible English word.

Japanese Kanji readings are ranked from common JMdict attestations and available frequency markers, including okurigana forms; grouped links and seed audio follow that exact order. Kanji playback always uses the first authored pronunciation. Existing English word cards have one authored IPA reading; reference entries preserve authoritative order within the preferred British variety before other varieties. Pronunciation frequency depends on context, and the sources do not provide a universal frequency rank for every reading.

Rebuild the reference shards with `python3 scripts/import-reference.py --source <source-file>`; Japanese accepts `--priorities <reading-priorities.json>`. `data/reference/manifest.json` records the source checksum, attribution, counts and shard digests. Shards are loaded only for requested keys, and runtime lookup results use Cognis caching.

### Whole-reading reference audio

Japanese additionally ships 2,913 whole-reading neural clips in bounded banks under `data/audio/reference/`. Together with seed recordings they cover the primary readings of all 12,356 source characters that have a reading; the remaining 752 source characters have no recorded reading and do not receive invented audio. The bank index selects the first authored reading and checks file bounds and cancellation. Generate a plan with `python3 scripts/reference-audio.py plan --work <directory>`, render its inventories with the synthesis script, then use `pack` to write the bounded banks.

The Japanese ranking tool accepts `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` and optional `--content-root data/library/content`. It prefers common standalone lexical readings, ranks other readings from frequency-weighted alignments of attested words, and preserves reviewed isolated-card choices from `data/audio/primary-readings.json`. Voicing and gemination map back to canonical source readings. Kun, on and name readings remain available; a selected first reading alone determines playback and lookup cache identity. Source frequency markers are an ordering aid, not a universal pronunciation-frequency measurement.

Automatic composition requires recordings for its spoken constituents. Missing recordings remain explicit errors and can be supplied through the normal audio upload field. Reference spellings that cannot be linked to the packaged alphabet retain their source text and definitions without fabricated spelling links.

### Technical specification

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

The Retrieve missing translations action calls `POST /api/v1/study/library/definitions/localize` with `{ translations, languages }`. It requests missing UI languages through `localization:translateString`, preserves supplied translations, and reports `missingLanguages` when a provider is absent or fails. Missing translations remain editable; English is not copied into other language fields. This is also available when adding a definition manually.

### Technical specification

Language-scoped galleries resolve the selected language from the path and filter visible decks through the Study public contract. A deck detail URL identifies its language and deck UUID; changing language returns to its gallery. Navigation does not carry transient query data.

Study uses the localized `navigationLabels` supplied by active adapter route descriptors for adapter-owned links, including Requests. It does not resolve their label keys through the gateway locale bundle. Labels select the exact UI locale, its base language, then English; Study-owned links continue to use the gateway XML resources.

### Guide the whole pattern consistently

Before the first input, an uncompleted pattern shows every stroke. After input begins, only the next stroke is guided across every character boundary. Previously completed patterns start with next-stroke guidance and retain hidden-stroke knowledge tests and the reveal action.

### Technical Specification

| Page / surface                   | Guide             | Access         |
| -------------------------------- | ----------------- | -------------- |
| `/study`                         | Study Overview    | Signed-in user |
| `^/study/(?:settings\|welcome)$` | Study Preferences | Signed-in user |
