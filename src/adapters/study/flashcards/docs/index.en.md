# Flashcards Adapter

## Usage

Enable the Study Flashcards adapter to build named decks from any readable Library layer or import Anki-compatible plain-text TSV notes. The adapter owns its routes, deck persistence, renderer, schedules, UI, and strings. Flip a card to reveal pronunciation and definitions, then grade Again, Good, or Easy. Again retries after one minute; Good starts at one day and doubles; Easy starts at four days and triples.

## Technical Specification

Decks are shareable resources of type `studyDeck` with the read capability `study:flashcards:read`. The standard Cognis Share control supports user recipients and public links, expiry, passwords, and revocation. Owners alone may edit or delete decks. User recipients can study and export; their review schedules are stored separately per account. A link guest studies in a temporary session without changing account schedules. Revocation and expiry are checked on every authenticated deck operation.

Sharing explicitly shares a deck snapshot, including selected card content and definitions, without granting access to the source Library or changing its scope. Owner edits refresh that snapshot. Unavailable source cards are skipped during the owner’s Library-backed study; previously shared snapshots remain deck content until the owner edits or deletes the deck. Deleting a deck revokes its shares and removes learner progress.

Import and export UTF-8, quoted tab-separated text with Front, Back, and optional Pronunciation columns. Exports include Anki separator, deck, and plain-text headers plus an optional Cognis context column; Anki can ignore that column. Embedded quotes, tabs, and newlines round-trip safely. This is TSV interchange, not an `.apkg` archive. Review history is private and is not exported.
