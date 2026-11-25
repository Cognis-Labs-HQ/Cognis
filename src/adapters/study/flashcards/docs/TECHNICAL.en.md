# Technical Reference

The public interfaces and operational rules of Flashcards.

## Interfaces

study:decks exposes the deck service. Authenticated /api/v1/study/decks supports GET listing, GET/:id details, POST upsert and DELETE/:id; POST/:id/review accepts cardId, grade and attempt.

## Configuration

Deck content and visibility are stored per resource. Read/Write mode is an account preference; starter decks come from registered providers rather than an adapter-wide hardcoded language list.

## Behavior

### Bounded Deck Documents

Deck membership, imported notes and learner schedules use Unicode-safe fragments of at most 60,000 UTF-8 bytes. A single joined read reconstructs each committed document; replacement and deletion share the deck transaction. Learner-row upserts serialize reviews and deck edits before snapshot reads, including under repeatable-read isolation. Attempt receipts commit with scheduling, and Progress delivery remains outside that transaction. Cards and schemas in responses and exports resolve current Library item IDs; saves do not duplicate Library card payloads.

Review requests accept at most 16 KiB of JSON; deck writes accept at most 5 MiB. Larger requests return HTTP 413 without changing a deck or schedule. Reading, writing, retry queues, imported notes and Library-backed cards keep their current behavior.

Practice uses a question and a single review answer; there is no front/back flipping. Wrong answers, answered cards and explicit Show Answer retain the full Library-backed review and existing Again grading. Sentence-only decks use Reading and hide the floating mode slot without overwriting the saved preference for drawable decks. Mixed decks keep the chosen mode. Sentence and long-answer layouts expand to 72rem within the page width. Malformed language tags return invalid_language with HTTP 400.

Reading prompts display the primary pronunciation beside the card value when they differ; equivalent normalized text is not repeated. A round question-mark hint highlights and focuses the correct current answer, including after choices are shuffled. Hint use records Again through the existing review flow, and a subsequent correct selection remains assisted. Ordinary unaided answers retain Good grading. Writing practice keeps its own guidance controls.

Try Again is shown only when the updated queue for the selected focus contains cards. An empty focus keeps the congratulations and Home action without offering an empty restart.

Completing a deck shows a centered green check and congratulations. Home returns to All. Try Again rebuilds the selected queue using updated review status and starts it from its first card, retaining the Total/Done/Due/New focus even when submitted reviews have changed card status. Only session answers and attempt identities reset; saved review progress remains intact. Shared-link practice uses the same completion view and temporary-session restart.

### Study Browsing and Favourites

See the [shared contract](/docs/study-language-framework/technical) for this behavior.

### Provider Starter Decks

A language descriptor may declare `starterDecks`: an array of `{ key, name, schemaId, sourceRecordIds }`. `key` is stable within the pack, `name` maps locale codes to deck names, and `sourceRecordIds` contains up to 500 distinct existing provider record keys in study order. Cognis resolves the keys from the global Library to canonical Library IDs. IDs remain stable across content revisions. Incomplete decks and disabled providers are omitted. Starter decks are read-only; learner schedules and favourites remain personal. Browsing resolves membership only, while opening a deck loads its card detail context.

Flashcards declares the shared page-builder and page-sections stylesheets, matching Explore and Requests. Each mount owns an abortable interaction scope so navigation cannot retain previous browse or study handlers. Adapter styles never override composer, shell or reusable button classes; regression checks enforce this boundary and the required stylesheet dependencies.

Successful deck creation and import dismiss the protected editor before navigating to the refreshed browse page, so saved changes do not trigger a discard prompt. Favourite-only Library results display selected child cards independently; restoring provider order restores their original nested placement.

### Saved Study Controls

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. The shared drawing heading masks the character until explicitly revealed. A second activation offers navigation confirmation outside Explore; within Explore it opens the card directly. Keyboard activation follows the same interaction.

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

The deck side menu scrolls with the document. Revealing the primary navigation does not resize an independent sidebar scroll area or shift the cards.

### Visible Practice Mode and Themed Controls

The persistent Read/Write selector now reveals its floating slot on Flashcards. Mode changes retain the saved preference and session restart confirmation. Export and Study settings icons use the active control color, following the app’s light/dark theme and hover state regardless of the operating-system theme.

Answer submissions may include an `attempt` object with `id` and ISO `occurredAt`. Re-deliver the same object and grade to retry; a new answer uses a new ID. Review receipts and scheduling changes commit together, and stable event IDs prevent duplicate Progress records. Browser history retains pending attempts without putting them in URLs. Flashcards declares Library and Progress dependencies. Shared cards and their schemas resolve current Library data after share authorization.

### Durable Practice Rewards

Flashcard scheduling and its attempt receipt commit before cross-adapter reward delivery. The separate `study:decks:recordResult` flow retries the same result after delivery failure without advancing the schedule again. This avoids nested database transactions when Progress persists the event.

See the [shared contract](/docs/gateways/study/technical) for this behavior.

The main browser entry is `ui/app/index.js`; its actions, markup, language and practice modules live beside it. Shared decks mount `ui/app/shared-deck.js`. Server-side deck behavior uses `service/index.ts` with its route, flow, store and result modules in the same service directory.

### Uniform Practice Sampling

See the [shared contract](/docs/gateways/study/technical) for this behavior.

Reading compares answer content using one shared normalization for distractor selection, hints and grading. Terminal sentence punctuation, case, compatible Unicode forms and repeated whitespace do not distinguish answers. Internal punctuation, numbers, accents and different words remain meaningful. Equivalent meanings never become competing choices; quizzes use two to four distinct choices when available. Correct equivalent submissions receive the ordinary successful grade before progress is submitted.

The deck sidebar scrolls independently within the visible page height, keeping long deck lists from expanding the page or pushing practice below the fold.

Opening another deck brings its content into view immediately; returning from Explore preserves the saved practice position.

### Empty offline Study pages

See the [shared contract](/docs/ui/technical) for this behavior.

### Durable Queued Results

Queued card reviews retain their successful result even if optional activity recording fails. Activity capture runs without holding up the review receipt. The existing account, consent and queue limits still apply.

### Enrolled Offline Workspace

See the [shared contract](/docs/ui/technical) for this behavior.

### Offline Study Practice

See the [shared contract](/docs/ui/technical) for this behavior.

### Share Delivery

Calendar and Flashcards sharing hooks tolerate unrelated resource providers returning no result, so both link and account shares can be created and resolved with all providers enabled. Share loading, account-share status and Calendar guest pages use responsive minimum sizes rather than requiring eight grid columns. Guest pages remain usable on narrow screens. Share maintenance runs sequentially, coalesces overlapping requests, ends a failed pass and retries at the next fifteen-minute interval. Disable stops subsequent work; reactivation resumes scheduling.

Guest Flashcard practice uses a temporary mode selection and disables account enhancements and persisted layout settings. It does not read or write account practice preferences.

## Security

Deck operations validate ownership and permitted shared access. Exports require creator or administrator authority; a deck share does not establish classroom membership or authorize rewards from arbitrary imported events.

## Reference

### Technical Specification

Decks are shareable resources of type `studyDeck` with the read capability `study:flashcards:read`. The standard Cognis Share control supports user recipients and public links, expiry, passwords, and revocation. Owners alone may edit or delete decks. User recipients can study; exports require creator or administrator access; their review schedules are stored separately per account. A link guest studies in a temporary session without changing account schedules. Revocation and expiry are checked on every authenticated deck operation.

Sharing grants deck-scoped access to current Library cards and definitions, without granting general Library access or changing card scope. Every shared opening resolves those IDs under the owner’s access after checking the share. Unavailable or disabled-provider cards are omitted. Gallery metadata and review responses do not expose saved card snapshots. Deleting a deck revokes shares and removes review schedules and delivery receipts.

Import and export UTF-8, quoted tab-separated text with Front, Back, and optional Pronunciation columns. Exports include Anki separator, deck, and plain-text headers plus an optional Cognis context column; Anki can ignore that column. Embedded quotes, tabs, and newlines round-trip safely. This is TSV interchange, not an `.apkg` archive. Review history is private and is not exported.

### Technical Specification

| Page / surface                            | Guide            | Access         |
| ----------------------------------------- | ---------------- | -------------- |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)` | Flashcards Guide | Signed-in user |
| Flashcards · `[data-study-deck]`          | Manage A Deck    | Signed-in user |
| Flashcards · `[data-practice]`            | Practise A Deck  | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.

The management guide uses the selected deck container as its boundary, including the edit, share and export controls. It remains unavailable in the deck list.

The practice guide covers the task and feedback. Choose reading or writing with the normal floating-menu selector after the guide finishes; it is not available while the tutorial owns that menu.
