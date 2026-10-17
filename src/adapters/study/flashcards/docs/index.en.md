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

Opening an account or shared deck asks the learner to choose Reading or Writing before practice begins. The chosen mode stays fixed for that session, including after visiting Explore and using browser Back. Cards without support for that mode can be skipped; they never silently change the session mode. New cards start with their answers hidden. Total, New, Due and Done retain their existing review filters; changing the filter starts another queue in the same mode.

Reading uses the primary pronunciation and three distinct visible Library distractors. Writing embeds the shared pad and presents the meaning and reading while concealing the character behind a click-to-reveal heading. Stroke mistakes do not automatically expose the character. Revealing the character is treated as an assisted attempt and records Again, even if later strokes succeed. A successful unaided attempt records Good. The answer can still be inspected on previously reviewed cards.

Deck galleries use `/study/<iso>/flashcards`; deck links use a readable name slug followed by `--<deck-id>`, such as `/study/ja/flashcards/first-japanese-words--<deck-id>`. Canonical English names keep the readable portion independent of the interface language. The identity suffix keeps duplicate names unambiguous and links consistent across owners and recipients with different deck catalogs. API resource IDs remain unchanged.

The active deck queue, index, grades, pending answer, filter and selected mode are retained in the current browser history entry. Returning from Explore restores the original queue and working Previous/Next controls rather than creating a one-card session. Revealing an answer or leaving to inspect an unanswered card retains an Again result. Source links pass ordered deck card IDs in history state so Explore previews can also navigate that deck, including child cards. Locations and card access remain authorized by the existing Library contracts; inaccessible cards are omitted when a session is restored.

All actions run the existing declared Study deck and drawing flows. The interface reuses the standard popup, buttons and existing flashcard layout styles. Account and shared decks use the same renderer and practice implementation; shared snapshots do not gain Library access. Page departure aborts mounted handlers and drawing sessions.

## Reading Feedback and Links

Reading submissions show a success or warning toast and animate the selected option; reduced-motion preferences disable the animation. The practice title and favourite star blend into the card while retaining keyboard focus indicators. A standard side menu lists the current language’s deck titles and highlights the active deck.

Explore card links include canonical card identity in `/study/explore/<language>/<layer>/<card-id>`. Ctrl-click, Command-click and Shift-click retain native browser navigation, and direct navigation opens the requested card preview. Looking up an unanswered card counts as an assisted attempt. Ordinary navigation preserves the deck queue for browser Back.
