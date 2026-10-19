# Study Controls and Access

**Feature Branch:** feature-update-external-package-contract-definitions

## Flashcard Practice

Reading or Writing is selected through a persistent floating preference for account and shared decks. The selected mode remains fixed during a session, including after visiting Explore and using browser Back; changing it requires confirmation before resetting progress. Cards without support for that mode can be skipped without an automatic mode change. New cards start with their answers hidden. Total, New, Due and Done retain their existing review filters; changing the filter starts another queue in the same mode.

Reading uses the primary pronunciation and three distinct visible Library distractors. Writing embeds the shared pad and presents the meaning and reading while concealing the character behind a click-to-reveal heading. Stroke mistakes do not automatically expose the character. Revealing the character is treated as an assisted attempt and records Again, even if later strokes succeed. A successful unaided attempt records Good. The answer can still be inspected on previously reviewed cards.

Deck galleries use `/study/<iso>/flashcards`; deck links use a readable name slug followed by `--<deck-id>`, such as `/study/ja/flashcards/first-japanese-words--<deck-id>`. Canonical English names keep the readable portion independent of the interface language. The identity suffix keeps duplicate names unambiguous and links consistent across owners and recipients with different deck catalogs. API resource IDs remain unchanged.

The active deck queue, index, grades, pending answer, filter and selected mode are retained in the current browser history entry. Returning from Explore restores the original queue and working Previous/Next controls rather than creating a one-card session. Revealing an answer or leaving to inspect an unanswered card retains an Again result. Source links pass ordered deck card IDs in history state so Explore previews can also navigate that deck, including child cards. Locations and card access remain authorized by the existing Library contracts; inaccessible cards are omitted when a session is restored.

All actions run the existing declared Study deck and drawing flows. The interface reuses the standard popup, buttons and existing flashcard layout styles. Account and shared decks use the same renderer and practice implementation; shared snapshots do not gain Library access. Page departure aborts mounted handlers and drawing sessions.

## Reading Feedback and Links

Reading submissions show a success or warning toast and animate the selected option; reduced-motion preferences disable the animation. The practice title and favourite star blend into the card while retaining keyboard focus indicators. A standard side menu lists the current language’s deck titles and highlights the active deck.

Explore card links include canonical card identity in `/study/explore/<language>/<layer>/<card-id>`. Ctrl-click, Command-click and Shift-click retain native browser navigation, and direct navigation opens the requested card preview. Looking up an unanswered card counts as an assisted attempt. Ordinary navigation preserves the deck queue for browser Back.

## Saved Study Controls

Reading/Writing is a saved account preference in the composer’s floating menu, defaulting to Reading. Changing it during practice uses the shared warning popup before restarting the queue; cancel keeps the current position and answers. Reviews already submitted remain saved. The sidebar includes All and marks the current deck. Writing headings blur a same-size masked glyph; the first click reveals it and enables its Explore deep link. A second click offers navigation confirmation. Keyboard activation follows the same interaction.

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

The dictionary provider selector uses theme-select and is hidden for a single provider. Settings follows the dictionary search input. KANJIDIC2 supplies kanji enrichment rather than a search option alongside Jisho; named reference sources identify their actual catalog.

Japanese small-kana word recordings, including 学校, are regenerated using kanji spelling where available, with the designated Japanese voice and stable settings. Packaged sentences are rebuilt from those exact clips. I- and na-adjective transformations include adverbial, negative and past forms, with dedicated recordings for curated forms. English plural recordings remain dedicated assets and are reached by selected-form playback.

## Card Media and Controls

Add optional image-list fields, private image uploads and detail galleries. Both language modules bundle a licensed reference photograph and expose the same field on every layer. Editor thumbnails load bundled and uploaded images, show a red remove control on hover or focus, and discard unused staged files without confirmation. Saved cards and request history keep their referenced files. The remove button has an opaque background so it remains readable over photographs. Custom image files and saved references persist across server restarts and provider reloads, including provider updates to edited cards. Global `ui:imagePreview` provides thumbnail rendering, binding and an `open` action through the registered `ui:imagePreview:open` flow. It is also available from `ui:reuse` as `image-preview.js`; its stylesheet is part of common reuse styles. Image buttons open the original image at its natural size, constrained to the viewport, with only the standard X control visible. Keyboard activation, Escape, focus return and owner/provider teardown use the shared popup lifecycle. Callers retain ownership of image URLs and optional removal actions. Library uses this shared control for uploaded and bundled images in editors and detail galleries.

Microphone recording waits for the browser’s permission response, blocks duplicate requests and saving while permission is pending, and releases a stream granted after the editor closes. Permission denial and unavailable recording have separate messages. Microphone, Play and Reload share one equally sized row. Collective Plural uses a single checkbox for its matching noun families; unrelated opt-ins remain hidden. Audio filenames are hidden. Play previews the latest staged upload or microphone recording; a delayed saved-audio response cannot replace it. Recording colors the microphone icon itself red, including while hovering; the button retains its ordinary theme styling.

## Editable Request Previews

Use standard card previews and the existing editor for administrator changes to staged cards. Approval preserves submitter attribution and adds modifying administrators as joint owners. Clearly label submitter and approver profiles, and confirm approval, decline and withdrawal.

## Study Notifications and Filters

Notify enabled administrators about incoming requests and other administrators’ decisions in Study. Remove navigation pulsing, add live current-page text filtering and keep the Flashcards side menu in document flow to prevent scrollbar-driven shifts. Notification capabilities resolve at delivery time and sender receipts are checked, including empty delivery lists and partial failures.

## Trace Access and Browse Cost

Reverse card traces apply the same live language availability and access checks as direct reads, and include current edit permissions. Browsing shares class write checks only within one response and avoids copying the full schema for each card; public schema results remain independent copies. Content-pack ingestion indexes assets once and writes each shared recording once while preserving every audio placement.

## Heading Style and Full Guides

Popup title links retain their compact text appearance and inherited typography even when shared button styles load afterward. The drawing pad’s guidance button always reveals the complete numbered stroke pattern, including completed strokes and all groups, after practice has started or on a previously completed character. Normal practice continues to show the next stroke; starting a new stroke resets the reveal.

## Automatic Dictionary Contents

Dictionary imports resolve unlinked card contents into complete, ordered references to existing character cards from the active schema and configured input carousels. Repeated kana and mixed writing units retain their positions; supplied composition links and dictionary readings remain authoritative. Incomplete matches stay available for manual resolution. When a complete sequence suggestion is offered for manually entered text, the redundant single-character suggestion is hidden.

## Restored Study Capabilities

Progress, Leaderboard, scoring and quota administration are available through their owning components. Drawing and flashcard results use Progress; assisted answers do not count as independently correct. Shared decks resolve current Library entries by ID, while imported notes retain a separate canonical identity. Reading choices use localized definitions and writing-unit readings. Pronunciation chips share canonical character links; dictionary imports hide the completed lookup, Library rows open editable cards, and chronological sorting breaks timestamp ties by Library sequence.

## Reliable Study Results

Class-scoped access and mentions use the current class-store contract and recheck membership. Content-pack pruning retains omitted records recursively referenced by user-authored cards or provider edits. Flashcard answer retries keep their attempt identity across navigation and update scheduling and Progress once. Drawing retries retain their event identity and avoid duplicate difficulty increments. Progress events use a canonical JSON shape; retrying an event repairs interrupted projections without duplicating history. Leaderboard saves recover after storage failures, require persistent storage, and resolve classroom access at call time. Shared decks resolve current schemas and Library records. Study production contracts align with their runtime interfaces, including schema defaults and audio decoding.

## Shared UI Ownership

Study uses the host-owned `ui:pageOverlay.create({ signal, bottomInset })` flow for floating drawing boundaries. The boundary follows page, header, footer and viewport changes without changing the page layout; closing the view or unloading the provider releases its observers, listeners and element. Embedded pads keep their supplied container.

Popup headings retain their existing typography and responsive layout through `headingLayout: "annotated"`, with neutral `aside` and `below` detail placements. The popup API exposes `appendHeadingAccessory(element)` and `setContentConcealed(boolean)`; concealment blurs the heading and body, blocks interaction and restores their prior accessibility state when released. Study styles only its own controls. Navigation uses `ui:navbarLinks`, including disabled links with localized explanations, and removes its link and search registration when unloaded.

## Durable Practice Rewards

Study loads adapter UUID dependencies and required core capabilities from each manifest. It bootstraps dependencies before consumers and recomputes availability after disablement; unavailable dependencies gate Drawing, Flashcards and Leaderboard. Drawing endpoints return 503 when Library or Progress is unavailable. Progress stores database-safe projection identities and trusted practice settles durable XP, achievements and evidence-backed standings. Flashcard reward delivery runs after its scheduling transaction, and retries retain one event, reward receipt and schedule update.

Flashcard scheduling and its attempt receipt commit before cross-adapter reward delivery. The separate `study:decks:recordResult` flow retries the same result after delivery failure without advancing the schedule again. This avoids nested database transactions when Progress persists the event.

Ledger summaries, booster redemption and activity invalidation run dedicated ctx flows with validation and execution stages. Invalid participant identifiers are rejected before reading or changing persistence.

The matching Explore grid preview is blurred and non-interactive while its character is open in the drawing pad. Repeated and newly rendered placements follow the same state; changing character, closing the pad or leaving the page restores them without changing card geometry.

Flashcard answer choices are standalone answer buttons. Card headings and revealed answers use in-app actions that retain departure confirmation and deck order without exposing card URLs on hover. Within Explore, the revealed drawing heading uses an action without a URL; its second click opens the card directly.

Writing practice uses only the drawing pad’s masked heading. Previous/next SVG arrows sit above the pad alongside the favourite control; next remains gated by an answer. Flashcards passes `suppressRetry: true` to the shared drawing pad, hiding and disabling its retry action; standalone practice keeps retry enabled by default.

Embedded consumers may supply `onNavigate(card)` after the shared heading confirmation. Flashcards uses it to settle the current attempt through its departure flow and preserve the deck navigation context before opening Explore.

Schema initialization changes a primary key only when one is explicitly declared and adds missing declared uniqueness. Existing independent primary keys, unique constraints and unique indexes remain intact; equivalent unique keys in another column order satisfy the declaration. The catalog reads only valid, ready indexes and joins only the table’s own primary/unique constraints. Repair rechecks the catalog under a table lock and shares a caller-owned transaction, so a failure rolls back the caller’s work correctly. A matching schema performs no key DDL or repair transaction.

Text columns may opt in to `textSize: "large"` for LONGTEXT or `textEncoding: "ascii"` for identifiers already restricted to ASCII by their owning contract. Defaults remain TEXT or VARCHAR(255). Initialization widens only explicitly declared large fields and reconciles explicitly requested encoding; indexed large text is rejected. Ledger/Leaderboard snapshots and packaged assets use large storage. Pack IDs and semantic versions use ASCII storage to keep the four-part asset primary key within InnoDB limits; publisher names and asset paths retain Unicode support. Library lookup indexes split scoped browsing and source-record lookup without changing entry encodings.

Structured text columns accept optional storage hints `textSize: "large"` and `textEncoding: "ascii"`. MariaDB maps them to LONGTEXT and ASCII storage; PostgreSQL and SQLite retain their native text representation. Callers must already validate identifiers as ASCII before requesting that encoding. Reward snapshots opt in to large text to preserve JSON beyond 64 KB; compare-and-swap revisions and transaction boundaries remain unchanged.

Packaged asset data uses explicit large-text storage. The asset primary key stores only validated pack IDs and semantic versions as ASCII; Unicode publisher names and asset paths retain their encoding. Entry columns retain Unicode capacity. Separate `(scope_id, schema_id, layer)` and `(scope_id, source_record_id)` indexes support browsing and provider lookup within MariaDB’s composite key limit.

The persisted leaderboard snapshot explicitly requests large-text storage so MariaDB can retain growing observations and archives beyond 64 KB without truncating JSON. PostgreSQL and SQLite keep their native text storage.

## Commits

- [f81a683f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f81a683f913c54821501fe475ba3fa317074aedd)
- [581b6928](https://github.com/Cognis-Labs-HQ/Cognis/commit/581b69283476ee95d6f7d65f4a3566332a2ec81a)
- [20d0c172](https://github.com/Cognis-Labs-HQ/Cognis/commit/20d0c172e97697a4aed295b2e25f6346d2b9edfc)
- [5a5d026f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a5d026f1e4be9b474c3e1f458d3fbe6cd5ac967)
- [b513366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b513366e7816352a0c357fddfd7b49a881341164)
- [ee448821](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee44882131400a8581dff790e5b7b84a48634641)
- [7f48ca82](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f48ca82ba3dee88919631ef5386697a60450937)
- [95ff5b75](https://github.com/Cognis-Labs-HQ/Cognis/commit/95ff5b7542de1a4d06df974462a917dc2388fae2)
- [e0d5ee9d](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0d5ee9d097422d673f3e34185f71c9e27137e53)
- [337c806e](https://github.com/Cognis-Labs-HQ/Cognis/commit/337c806eaa01da43b3a098a641f618ee9745af43)
- [6d3f8f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d3f8f273e8b97a0f97692a52ff3c674eb6f7892)
