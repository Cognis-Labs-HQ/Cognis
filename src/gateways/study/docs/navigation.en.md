# Study navigation

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
