# Study navigation

Flashcards uses `/study/<iso>/flashcards` and `/study/<iso>/flashcards/<deck-id>`. The sub-navigation language controls select the corresponding gallery; a deck from another language is not carried across. `/study/flashcards` resolves the current language. Library and Requests remain shared pages.

## Usage examples

Open `/study/ja/flashcards` to browse Japanese decks; selecting English opens `/study/en/flashcards`.

## Technical specification

Language-scoped galleries resolve the selected language from the path and filter visible decks through the Study public contract. A deck detail URL identifies its language and deck UUID; changing language returns to its gallery. Navigation does not carry transient query data.
