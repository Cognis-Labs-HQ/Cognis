# Flashcards Adapter

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

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. Writing headings blur a same-size masked glyph; the first click reveals it and enables its Explore deep link. A second click offers navigation confirmation. Keyboard activation follows the same interaction.

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

The deck side menu scrolls with the document. Revealing the primary navigation does not resize an independent sidebar scroll area or shift the cards.

## Visible Practice Mode and Themed Controls

The persistent Read/Write selector now reveals its floating slot on Flashcards. Mode changes retain the saved preference and session restart confirmation. Export and Study settings icons use the active control color, following the app’s light/dark theme and hover state regardless of the operating-system theme.

Answer submissions may include an `attempt` object with `id` and ISO `occurredAt`. Re-deliver the same object and grade to retry; a new answer uses a new ID. Review receipts and scheduling changes commit together, and stable event IDs prevent duplicate Progress records. Browser history retains pending attempts without putting them in URLs. Flashcards declares Library and Progress dependencies. Shared cards and their schemas resolve current Library data after share authorization.

## Durable Practice Rewards

Flashcard scheduling and its attempt receipt commit before cross-adapter reward delivery. The separate `study:decks:recordResult` flow retries the same result after delivery failure without advancing the schedule again. This avoids nested database transactions when Progress persists the event.
