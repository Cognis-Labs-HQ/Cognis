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
