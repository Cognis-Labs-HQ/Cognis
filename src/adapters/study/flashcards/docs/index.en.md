# Flashcards Adapter

## Bounded Deck Documents

Deck membership, imported notes and learner schedules use Unicode-safe fragments of at most 60,000 UTF-8 bytes. A single joined read reconstructs each committed document; replacement and deletion share the deck transaction. Learner-row upserts serialize reviews and deck edits before snapshot reads, including under repeatable-read isolation. Attempt receipts commit with scheduling, and Progress delivery remains outside that transaction. Cards and schemas in responses and exports resolve current Library item IDs; saves do not duplicate Library card payloads.

Review requests accept at most 16 KiB of JSON; deck writes accept at most 5 MiB. Larger requests return HTTP 413 without changing a deck or schedule. Reading, writing, retry queues, imported notes and Library-backed cards keep their current behavior.

Practice uses a question and a single review answer; there is no front/back flipping. Wrong answers, previously answered cards and explicit Show Answer retain the full Library-backed review and existing Again grading. Sentence-only decks use Reading and hide the floating mode slot without overwriting the saved preference for drawable decks. Mixed decks keep the chosen mode. Sentence and long-answer layouts expand to 72rem within the page width. Malformed language tags return invalid_language with HTTP 400.

Reading prompts display the primary pronunciation beside the card value when they differ; equivalent normalized text is not repeated. A round question-mark hint highlights and focuses the correct current answer, including after choices are shuffled. Hint use records Again through the existing review flow, and a subsequent correct selection remains assisted. Ordinary unaided answers retain Good grading. Writing practice keeps its own guidance controls.

Try Again is shown only when the updated queue for the selected focus contains cards. An empty focus keeps the congratulations and Home action without offering an empty restart.

Completing a deck shows a centered green check and congratulations. Home returns to All. Try Again rebuilds the selected queue using updated review status and starts it from its first card, retaining the Total/Done/Due/New focus even when submitted reviews have changed card status. Only session answers and attempt identities reset; saved review progress remains intact. Shared-link practice uses the same completion view and temporary-session restart.

## Usage

Open a visible deck from Flashcards to begin practicing immediately. Use Total, Done, Due or New to choose the cards to study.

## Technical Specification

Decks are shareable resources of type `studyDeck` with the read capability `study:flashcards:read`. The standard Cognis Share control supports user recipients and public links, expiry, passwords, and revocation. Owners alone may edit or delete decks. User recipients can study; exports require creator or administrator access; their review schedules are stored separately per account. A link guest studies in a temporary session without changing account schedules. Revocation and expiry are checked on every authenticated deck operation.

Sharing grants deck-scoped access to current Library cards and definitions, without granting general Library access or changing card scope. Every shared opening resolves those IDs under the owner’s access after checking the share. Unavailable or disabled-provider cards are omitted. Gallery metadata and review responses do not expose saved card snapshots. Deleting a deck revokes shares and removes review schedules and delivery receipts.

Import and export UTF-8, quoted tab-separated text with Front, Back, and optional Pronunciation columns. Exports include Anki separator, deck, and plain-text headers plus an optional Cognis context column; Anki can ignore that column. Embedded quotes, tabs, and newlines round-trip safely. This is TSV interchange, not an `.apkg` archive. Review history is private and is not exported.

## Study Browsing and Favourites

Flashcards opens a browse page containing owned decks, decks shared with the current account, and complete starter decks from enabled language providers. Bearer-link shares retain their existing access rules and are not a public directory. The widget’s top-right + menu offers Create Deck and Import Deck. Explore, Library, and Flashcards reuse account-persisted Study favourites and sorting controls (provider order, A–Z, Z–A, newest first, oldest first). An outlined star filters the current results to favourites and turns gold when enabled. Library items, decks, and individual study flashcards have independent favourite toggles. Favourites never grant access to content. The drawing pad releases its session on route changes, and its floating boundary no longer overrides composer or shell classes.

## Provider Starter Decks

A language descriptor may declare `starterDecks`: an array of `{ key, name, schemaId, sourceRecordIds }`. `key` is stable within the pack, `name` maps locale codes to deck names, and `sourceRecordIds` contains up to 500 distinct existing provider record keys in study order. Cognis resolves the keys from the global Library to canonical Library IDs. IDs remain stable across content revisions. Incomplete decks and disabled providers are omitted. Starter decks are read-only; learner schedules and favourites remain personal. Browsing resolves membership only, while opening a deck loads its card detail context.

Flashcards declares the shared page-builder and page-sections stylesheets, matching Explore and Requests. Each mount owns an abortable interaction scope so navigation cannot retain previous browse or study handlers. Adapter styles never override composer, shell or reusable button classes; regression checks enforce this boundary and the required stylesheet dependencies.

Successful deck creation and import dismiss the protected editor before navigating to the refreshed browse page, so saved changes do not trigger a discard prompt. Favourite-only Library results display selected child cards independently; restoring provider order restores their original nested placement.

## Saved Study Controls

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. The shared drawing heading masks the character until explicitly revealed. A second activation offers navigation confirmation outside Explore; within Explore it opens the card directly. Keyboard activation follows the same interaction.

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

The deck side menu scrolls with the document. Revealing the primary navigation does not resize an independent sidebar scroll area or shift the cards.

## Visible Practice Mode and Themed Controls

The persistent Read/Write selector now reveals its floating slot on Flashcards. Mode changes retain the saved preference and session restart confirmation. Export and Study settings icons use the active control color, following the app’s light/dark theme and hover state regardless of the operating-system theme.

Answer submissions may include an `attempt` object with `id` and ISO `occurredAt`. Re-deliver the same object and grade to retry; a new answer uses a new ID. Review receipts and scheduling changes commit together, and stable event IDs prevent duplicate Progress records. Browser history retains pending attempts without putting them in URLs. Flashcards declares Library and Progress dependencies. Shared cards and their schemas resolve current Library data after share authorization.

## Durable Practice Rewards

Flashcard scheduling and its attempt receipt commit before cross-adapter reward delivery. The separate `study:decks:recordResult` flow retries the same result after delivery failure without advancing the schedule again. This avoids nested database transactions when Progress persists the event.

Flashcard answer choices are standalone answer buttons. Card headings and revealed answers use in-app actions that retain departure confirmation and deck order without exposing card URLs on hover. Within Explore, the revealed drawing heading uses an action without a URL; its second click opens the card directly.

Writing practice uses only the drawing pad’s masked heading. Previous/next SVG arrows sit above the pad alongside the favourite control; next remains gated by an answer. Flashcards passes `suppressRetry: true` to the shared drawing pad, hiding and disabling its retry action; standalone practice keeps retry enabled by default.

Embedded consumers may supply `onNavigate(card)` after the shared heading confirmation. Flashcards uses it to settle the current attempt through its departure flow and preserve the deck navigation context before opening Explore.

The main browser entry is `ui/app/index.js`; its actions, markup, language and practice modules live beside it. Shared decks mount `ui/app/shared-deck.js`. Server-side deck behavior uses `service/index.ts` with its route, flow, store and result modules in the same service directory.

## Uniform Practice Sampling

Drawing guidance and Flashcard answer shuffling share the `randomIndex` helper. It uses Web Crypto with masked rejection sampling, supporting integer ranges from 1 through 2^32 without modulo bias. Single-position ranges need no entropy. The caller may inject an entropy source for deterministic testing; normal practice always uses Web Crypto.

Reading compares answer content using one shared normalization for distractor selection, hints and grading. Terminal sentence punctuation, case, compatible Unicode forms and repeated whitespace do not distinguish answers. Internal punctuation, numbers, accents and different words remain meaningful. Equivalent meanings never become competing choices; quizzes use two to four distinct choices when available. Correct equivalent submissions receive the ordinary successful grade before progress is submitted.

The deck sidebar scrolls independently within the visible page height, keeping long deck lists from expanding the page or pushing practice below the fold.

Opening another deck brings its content into view immediately; returning from Explore preserves the saved practice position.

## Empty offline Study pages

Prepared Study pages remain navigable in a verified, consented offline session even without private content snapshots. Missing language/preference metadata produces empty navigation data. Explore mounts its normal empty browser and shows “No offline cached content available” instead of route-unavailable feedback or error toasts. Flashcards also retains an empty page when deck data or a required view resource is missing. Notices are scoped to the current page and deduplicated. Cache misses do not conceal access or consent denials. Library and flashcard providers prepare their public translations and light templates online; private data stays in the bounded tab-local caches.

## Durable Queued Results

Queued card reviews retain their successful result even if optional activity recording fails. Activity capture runs without holding up the review receipt. The existing account, consent and queue limits still apply.

## Enrolled Offline Workspace

Flashcards prepares every visible deck in enrolled learning or teaching languages, with two workers and no 80-deck cutoff. The dedicated cache is bounded to 64 MB and 10,001 reads so the gallery and ordinary deck collections fit together; larger collections remain subject to that limit. Non-enrolled languages are excluded. The shared schema catalog prepares even without enrollment, and missing optional Library collections do not prevent a prepared deck from entering practice.

## Offline Study Practice

Enrollment preparation caches the shared schema catalog as well as each enrolled language’s catalog. Drawing and Flashcards can use their normal schema reads without a prior online page visit. Flashcards prepares its Share translations alongside its Study translations and gallery template, and reads selected-language collections using the same schema-qualified requests as the enrollment warmer. Prepared decks can open gallery and practice views offline. Audio, dictionary fetching, content edits and access/consent checks keep their existing restrictions.
