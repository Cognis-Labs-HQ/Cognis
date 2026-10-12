# Flashcards Adapter

## Usage

Open a visible deck from Flashcards to begin practicing immediately. Use Total, Done, Due or New to choose the cards to study.

## Technical Specification

Decks are shareable resources of type `studyDeck` with the read capability `study:flashcards:read`. The standard Cognis Share control supports user recipients and public links, expiry, passwords, and revocation. Owners alone may edit or delete decks. User recipients can study; exports require creator or administrator access; their review schedules are stored separately per account. A link guest studies in a temporary session without changing account schedules. Revocation and expiry are checked on every authenticated deck operation.

Sharing explicitly shares a deck snapshot, including selected card content and definitions, without granting access to the source Library or changing its scope. Owner edits refresh that snapshot. Unavailable source cards are skipped during the owner’s Library-backed study; previously shared snapshots remain deck content until the owner edits or deletes the deck. Deleting a deck revokes its shares and removes learner progress.

Import and export UTF-8, quoted tab-separated text with Front, Back, and optional Pronunciation columns. Exports include Anki separator, deck, and plain-text headers plus an optional Cognis context column; Anki can ignore that column. Embedded quotes, tabs, and newlines round-trip safely. This is TSV interchange, not an `.apkg` archive. Review history is private and is not exported.

## Study Browsing and Favourites

Flashcards opens a browse page containing owned decks, decks shared with the current account, and complete starter decks from enabled language providers. Bearer-link shares retain their existing access rules and are not a public directory. The widget’s top-right + menu offers Create Deck and Import Deck. Explore, Library, and Flashcards reuse account-persisted Study favourites and sorting controls (provider order, A–Z, Z–A, newest first, oldest first). An outlined star filters the current results to favourites and turns gold when enabled. Library items, decks, and individual study flashcards have independent favourite toggles. Favourites never grant access to content. The drawing pad releases its session on route changes, and its floating boundary no longer overrides composer or shell classes.

## Provider Starter Decks

A language descriptor may declare `starterDecks`: an array of `{ key, name, schemaId, sourceRecordIds }`. `key` is stable within the pack, `name` maps locale codes to deck names, and `sourceRecordIds` contains up to 500 distinct existing provider record keys in study order. Cognis resolves the keys from the global Library to canonical Library IDs. IDs remain stable across content revisions. Incomplete decks and disabled providers are omitted. Starter decks are read-only; learner schedules and favourites remain personal. Browsing resolves membership only, while opening a deck loads its card detail context.

Flashcards declares the shared page-builder and page-sections stylesheets, matching Explore and Requests. Each mount owns an abortable interaction scope so navigation cannot retain previous browse or study handlers. Adapter styles never override composer, shell or reusable button classes; regression checks enforce this boundary and the required stylesheet dependencies.

Successful deck creation and import dismiss the protected editor before navigating to the refreshed browse page, so saved changes do not trigger a discard prompt. Favourite-only Library results display selected child cards independently; restoring provider order restores their original nested placement.

## Flashcard Practice

Decks open directly into practice. Total includes every card; New includes cards without a review record; Due includes reviewed cards whose scheduled time has arrived; Done includes reviewed cards scheduled for later. New cards, including new cards within Total, display their complete flashcard. Other cards reveal the answer only after a wrong reading choice or rejected writing stroke. Selecting a summary category starts a fresh queue.

Reading offers the primary pronunciation and three distinct pronunciations from the same ranked, visible Library similarities used by Explore. Reading is available only when three valid distractors exist. Writing embeds the complete shared Study drawing pad in the practice panel, locks the character, and uses ordered stroke scoring for success. Unsupported cards can be skipped without recording a successful review. A correct attempt or studying a new card schedules Good; an incorrect attempt schedules Again.

Library-derived labels, readings and definitions link to the source card in Explore. A departure confirmation protects the practice session. Inaccessible sources retain Library authorization and cannot be opened through a shared snapshot. Export uses the themed download icon in the upper-right corner and is available only to the creator or an administrator. The Flashcards menu stays active on deck routes.

Browser actions run declared study:decks flows with before, execute and after stages. Server list and details run authorize, read and audit stages; saves, reviews and deletion retain validation, authorization and transaction stages. Study owns public drawing, pattern composition, similarities and action-flow reuse; the optional Drawing adapter contributes only floating-pad integration. Its absence does not disable embedded Writing. All mounts and embedded sessions abort on departure.

### Consolidated Deck Practice

Renderer contract: `flashcardValues(detail, schemas, language)` resolves localized content; `renderFlashcard(detail, schemas, language, link)` renders the complete answer with canonical links; `noteDetails(notes)` adapts imported notes without mutating them. Practice mounts control answer visibility and animation for both account and shared decks. Shared decks use the localized page subtitle.
