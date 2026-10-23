# Unified Study Library

**Feature Branch:** feature-create-multi-layered-library-adapter

## Traceable material layers

Added a Study Library adapter with immutable layers for writing systems, definitions, language material, exercises, workouts, routines, and collections. Directed references make every material traceable to its building blocks.

## Secure scopes and publishing

Added global, class, and private user scopes with role- and membership-aware access controls. Upstream requests use destination approval and copy all referenced dependencies together.

## Import, export, and UI

Exposed the Library through ctx and authenticated APIs, including validated global JSON import, JSON export, Anki-compatible export, Unicode word decomposition, deep-link queries, and an all-user Study sub-navigation page.

## Consumer-selectable templates

Language and activity consumers can clone the canonical template with only the layers they request. Layer-aware link metadata preserves valid relationships, marks required dependencies, and infers character-to-word and word-to-sentence links.

## Define the relationship framework redesign

Added a staged implementation plan for replacing fixed Library layers with consumer-owned schemas, enforced generic relationships, pluggable resolution and lookup flows, complete entry-detail UI, deep links, and reversible migration.

## Execute the redesign

Replaced fixed layers with persisted, versioned consumer schemas; enforced typed fields, cardinality, ordered edges, schema versions, and visible relationship targets; and added Unicode grapheme resolution plus removable, provenance-aware lookup providers.

## Complete relationship browsing

Added provider-neutral schema, detail, trace, resolution, and lookup APIs. The schema-driven Library UI now browses arbitrary layers and opens reload-safe details showing fields, components, and incoming usage through the Study gateway client.

## Breaking capability change

The breaking schema capability was introduced in Library adapter 2.0.0; declarative content-pack ingestion advances it to 2.1.0. Consumers must register a schema and identify its schema and relationship IDs instead of using the removed fixed layer catalogue, template cloning, or layer-specific import and export methods.

## Add declarative language packs

Language packages can now submit a data-only directory to the Library capability for deterministic inspection and atomic ingestion. Cognis validates safe paths, manifests, licenses, schemas, every record and relationship, derives stable namespaced IDs, and records versioned installation receipts. The language framework now documents the required manifest, schema, layer directories, record files, and the boundary between content packs and executable resolver or lookup adapters.

## Localized definition records

Definition layers now declare module-owned string-key mappings. The Library creation form requests every Cognis UI language while requiring only English, generates a stable key tied to the definition entry ID, and offers an optional ctx translation capability for future providers.

## Mature the Library browser

Reworked the Library into layer tabs with card-based entries and reusable popup details. Entry selection and relationship traversal now stay behind the scenes without exposing record identifiers in the browser URL, while previous and next controls use equal-width directional navigation. The Study sub-navigation also gives every control enough room instead of clipping controls on hover.

## Integrate supporting content

Definitions and particles now stay out of direct Library browsing. Item details place localized definitions beneath the heading, include sentence particles as read-only relationship details, present badge metadata as pills, identify scope with accessible SVG icons, and expose every badge field as a card filter.

## Refine Library filtering and details

Library metadata dropdowns now use shared theme styling and apply selections as soon as they change. Detail popups use larger headings, place both definitions and meanings beneath the title, and present recognized constituent entries as navigable sub-boxes in the heading instead of a separate Components section.

## Add pill filters and shared audio

Replaced metadata dropdowns with optionally grouped filter pills and restored the Study navigation split between left-side pages and right-side language controls. Writing-unit schemas now require pronunciation and audio; modules can provide local audio or HTTPS sources that Cognis downloads once into an access-controlled shared local cache.

## Restore Library loading and gateway storage

Restored Library rendering on browsers without native `Map.groupBy`, normalized Study language codes so registered flags remain attached to language controls, and moved remote-audio persistence entirely behind a component-owned Files gateway namespace. The Library no longer writes cache files directly or imposes its own audio size ceiling.

## Align with upstream Development

Merged the latest upstream Development changes and resolved the retired registration invite adapter in favor of upstream's token-based implementation, keeping the Study Library feature compatible with the current application architecture.

## Refresh Study adapter compatibility

Raised the Library and Progress adapters' tested gateway ceiling to the upstream gateway version, bumped both adapter versions, and restored their complete workspace lockfile records so clean dependency installation succeeds after the merge. Corrected upstream registry integrity metadata also makes the locked dependency set reproducible.

## Limit changes to the Library scope

Removed unrelated core, API, router, adapter, gateway, and feature changes so this pull request contains only the Study Library, its Study integration, and the reusable UI facilities those components require.

## Route grouped Study sub-pages

Added a generic UI capability for grouped sub-page discovery, caching, invalidation, and route resolution. Study now uses one provider-backed model for each language’s page list, the selected-language submenu, hub cards, and child-page loading, while navigation preserves the selected language in private history state.

## Restore Library interaction polish

Stabilized header collapse while scrolling, populated Study layer navigation on first load, removed language-button overflow, and restored compact popup headings. The administrator Library now opens read-only row details with a simplified reference summary and right-click multi-select, while learner cards again preview pronunciations and definitions, retain deep links, and avoid duplicate detail sections. Active layer state, centered selection marks, and theme-aware edit controls now remain visually consistent.

## Provider-owned Library editing

Library rows now open read-only details across their whole hit area, while theme-aware edit actions remain at the trailing edge. Provider schemas control field labels, controls, immutable classifications, deep-link relationships, and language-scoped audio browsing. Tag fields commit on Enter, selected options toggle off, required fields validate before submission, and floating actions have localized labels. Cards and Study sub-navigation now use stable, theme-aware hover treatments, and composition chooses the closest higher-level records before atomic characters.

## Polish Library previews and administrator inspection

Simplified learner cards to a sleek one-line label and pronunciation treatment with a separate scope indicator, removing definitions and metadata from previews. Administrator row clicks now open the same schema-driven form as editing in a disabled, read-only mode instead of opening the learner detail popup.

## Clarify compact cards and vocabulary links

Darkened learner-card surfaces, reserved a compact non-obstructing corner for variant guidance, and removed redundant relationship hover overlays. Vocabulary relationship labels now include provider-supplied pronunciation so meaningful single-character words remain distinguishable from their writing-unit records.

## Keep nested variant branches visible

Library grids retain their clipping boundary. Expanded branches now evaluate provider-preferred and fallback directions against the rendered bounds so nested cards stay inside the card grid. The long-press hint no longer animates or blurs and its text is 25% larger.

## Constrain provider-preferred variant placement

Replaced overflow bleed with bounded runtime placement. Provider directions remain first choice, but each visible nested branch is measured and redirected when necessary so every card stays inside the Library grid and widget.

## Keep nested card anchors stable

Nested fitting now measures only the card being placed, so a descendant cannot move its already-positioned parent. When the pruned path has too few surrounding slots, sibling cards reuse a direction at increasing distance and stack along the same row or column.

## Remove duplicate vocabulary title details

Vocabulary popups now reserve the main title for the lexical-unit label and show only its active-language localized definition in the title detail. Alternate spellings, pronunciations, and variant-parent annotations no longer duplicate the vocabulary heading.

## Inherit contextual vocabulary definitions

Following a related-entry card into vocabulary now carries the source card’s localized definition as a fallback. The vocabulary record’s own definition remains authoritative, and unrelated popup navigation clears the fallback so meanings cannot leak between browsing paths.

## Present ordered multiple definitions

Cards now preserve provider definition order: the first localized definition is promoted beside the title unless it duplicates the title, while remaining definitions render in an Additional Definitions section only when present. A navigation-source fallback is used only when the vocabulary supplies no definitions.

## Keep sibling child cards in distinct slots

Runtime variant fitting now tracks the root and each already-positioned visible child as occupied rectangles. It preserves provider-preferred bounded positions when free and selects the least-overlapping bounded alternative otherwise, so siblings no longer collapse into the same slot.

## Reliability and Isolation

Packaged assets use study_library_asset_chunks, keyed by a SHA-256 identity of the publisher, pack, version and full asset path plus an integer position. The public asset URL and original bytes remain unchanged. A pack-key index scopes removal. Schemas retain their schema/version identity and use a base fragment plus study_library_schema_parts. Both payloads use Unicode-safe fragments of at most 60,000 UTF-8 bytes. Reads assemble fragments in order; ingestion replaces them in its existing transaction. Schema-version conflicts, sole-publisher replacement, rollback and shorter replacements retain their existing semantics.

Library JSON mutations accept at most 5 MiB and reject larger streams with HTTP 413 before invoking a mutation. Card field JSON and its normalized searchable form each have a 50,000-byte UTF-8 budget, leaving space for labels and tags in the search projection. Audio attachments require an exact upload path; traversal and nested paths are rejected before storage access. Creating and editing cards share one canonical reference writer, preserving groups, positions and selected transformations. Failed location loading shows a localized toast; responses from cancelled mounts do not update current controls.

Reward snapshots retain participant revision checks and use a base fragment plus engagement_participant_parts. A commit checks and advances the revision and replaces all fragments in one transaction. Reads join the base and ordered fragments in one statement so revisions and payloads cannot come from different commits. Each fragment is at most 60,000 UTF-8 bytes. Failure rolls back the revision and bytes; conflicting writers receive engagement_state_conflict. Tests enforce the physical text budget rather than accepting unbounded strings.

Shared Progress event, actor, projection and capability types live in gateways/study/reuse/progress.ts. The gateway no longer imports an optional adapter entry point for these contracts; the adapter implements the same capability and keeps its public exports. Event and correction JSON bodies are limited to 60,000 bytes; oversized requests return 413 before recording. Existing privacy, classroom checks, correction, rewards and rebuild flows remain active.

Unauthenticated definitions and standings requests invoke the injected authentication guard and finish with HTTP 401 before reading leaderboard data. Route parameters use the existing typed HTTP and authorization contracts.

Review requests accept at most 16 KiB of JSON; deck writes accept at most 5 MiB. Larger requests return HTTP 413 without changing a deck or schedule. Reading, writing, retry queues, imported notes and Library-backed cards keep their current behavior.

Vault PUT requests use the API shared streaming JSON reader with the effective vault budget and 1 KiB of envelope space. The adapter retains its own policy, 413 error and serialized-vault validation; no second buffering implementation is maintained.

Study pages share one composer sub-navigation slot, resolve common navigation/action labels from ui.reuse in all four languages, and retain current route selection at rendering time. Cancelled router scopes stay cancelled when replaced. Image-preview failures show a localized error toast and release the open-state lock so another attempt is possible.

## Bounded Deck Documents

Deck membership, imported notes and learner schedules use Unicode-safe fragments of at most 60,000 UTF-8 bytes. A single joined read reconstructs each committed document; replacement and deletion share the deck transaction. Learner-row upserts serialize reviews and deck edits before snapshot reads, including under repeatable-read isolation. Attempt receipts commit with scheduling, and Progress delivery remains outside that transaction. Cards and schemas in responses and exports resolve current Library item IDs; saves do not duplicate Library card payloads.

## Extensible Browser Actions

The Library provider publishes `study:library:client` through its lifecycle-scoped ctx. Every gateway client operation runs `study:library:<clientFunction>` through `before`, `execute` and `after`. For example, extend `study:library:createLibraryEntry` at `before` to inspect or adjust `input.args` (the client function’s positional arguments), or throw to veto before the request. The `after` stage receives `data.result` and may adjust the returned value. Server authorization and validation still apply. Reads, dictionary resolution, imports, publishing requests and media mutations use the same boundary. Provider teardown aborts in-flight requests and removes capabilities, flows and hooks; stale handles reject. Re-enabling registers fresh actions.

## Decode Notification Text Once

Request notifications decode XML entities in one pass and interpolate account/request values once as literal data. Encoded entity text stays encoded at the next level. Empty or missing preferred-language strings use the English value; a missing English value fails explicitly. The four resource catalogs are cached for the notifier lifetime, and failed reads remain retryable.

## Honor Study Authentication

Study requires the Authentication gateway and its `auth:routeContext` capability before registering routes. Adapter administration, language discovery and drawing routes use the injected context, including custom guards. Missing authentication contracts fail bootstrap instead of selecting a default guard.

## Uniform Practice Sampling

Drawing guidance and Flashcard answer shuffling share the `randomIndex` helper. It uses Web Crypto with masked rejection sampling, supporting integer ranges from 1 through 2^32 without modulo bias. Single-position ranges need no entropy. The caller may inject an entropy source for deterministic testing; normal practice always uses Web Crypto.

## Keep Test Fixtures as Data

Study discovery tests copy static adapter modules and put configurable identities and dependencies in JSON. They do not build executable source from serialized values. Shared setup preserves real discovery and bootstrap behavior. Marketplace artwork tests compare parsed URL origins and paths exactly, including private GitHub requests.

## Keep Sentence Form Selection

Repeated verb, adverb and plural-capable selections use the transformation picker before appending another sentence placement. Cancelling leaves the authored composition unchanged. Keyring activity is bounded without deleting secrets, existing vaults remain readable for compaction within the hard limit, and failed background sync is visible.

## Generated Transformations

Each transformation set declares a required `flag`, such as `transform:verb` or `transform:plural`, alongside its grammatical `matchTags`. Only flagged base cards activate that family. Unknown or unproductive flags fail validation. Forms are read-only views identified by the canonical base UUID and `{setId, path}`; they cannot be authored, imported or shipped as independent cards. Genuine lexical homographs with a different grammatical class remain valid.

Rules transform spelling and pronunciation with suffix removal, suffix addition, optional prefix removal/addition, ordered `suffixes` alternatives and per-lemma `forms` overrides for irregular grammar. Overrides replace the generic text operation. Paths compose across multiple states, including multiword forms; repeating growth cycles fail. Definition templates interpolate once and keep inserted text opaque.

Detail views, sentence validation and audio use the same resolver. Generated views preserve reference images but clear base audio and stroke fields. Audio lookup uses the generated spelling and primary pronunciation; refreshing it does not modify the base card. Drawing composes the generated spelling from writing-unit patterns, preserving stroke groups and ignoring spaces. Provider recording tests require every enabled rule to have a path-bound clip. No materialized-card representation or compatibility aliases are supported.

## Restore module data cleanup

Uninstall hooks now resolve live public capabilities through the same boundary as module startup, allowing Japanese and English content-pack deletion after disabling the language module. Tests cover retained content, both language packs, provider failures and replacement, and private-capability isolation.

## Install large modules reliably

Module installation now fetches the exact catalog commit once, allows sustained large downloads, and detects stalled transfers. The browser waits for the server result instead of reporting a TLS failure after two minutes. Connection failures and installation timeouts have separate localized messages, and logs record transfer stages without assuming an MTU fault.

## Restore composed flashcard headings

Flashcards now renders the canonical items of a composed heading as individually boxed, keyboard-accessible controls. The Library publishes its existing title resolver through a lifetime-scoped UI capability, preserving literal text, item order and selected transformations. Explore opens the selected form after the existing departure confirmation; single-card titles and favourite buttons retain their seamless appearance.

## Grade punctuation-equivalent answers fairly

Reading quizzes share answer normalization between choice generation, hints and grading. Formatting-only variants cannot compete as different answers or cause failed progress; smaller sets of distinct choices remain playable. Negation, numbers and meaningful internal punctuation stay distinct.

## Provider-controlled carousel visibility

Every `tag_carousels` item must declare `excludeFromBrowse`: `false` keeps its visible vocabulary in ordinary browsing; `true` reserves it for the composer. This is an explicit provider decision, independent of hidden pronunciation helpers. Existing metadata filter selection behavior is preserved.

## Restore direct Study loading

Corrected Study gateway public import URLs and placed the shared definition-language catalog inside the Library’s public reuse directory. A regression test loads providers and page import graphs through the real static router, covering paths that bundling aliases previously masked.

## Show the active module lifecycle action

Module buttons show Enabling, Disabling or Uninstalling while that action runs, instead of incorrectly showing Installing. Upgrade and downgrade labels are preserved.

## Curated learner classifications

Layer `detail.tags` is an explicit allowlist of localized learner pills; internal tags remain stored for transformations and editing. Only tags marked `filterable` become tag filters. Field option labels are localized, and filters follow provider option order. Optional fields can declare `detail.autoSelectSingle: false` to keep the initial view unfiltered.

A string field can declare `derivation: { kind: "rankedReferences", relationships, values, requireAll, transformationValues }`. Values run from easiest to hardest. The field resolves through canonical referenced IDs, and selected transformation rule IDs contribute their declared ranks. An authored field value is a minimum grammar requirement. Sentences match exactly the hardest requirement: N5 + N4 matches N4, while N5-only and N3-containing sentences do not. Missing, ambiguous or inaccessible classifications remain unclassified when `requireAll` is true. Resolution is cached within each render, does not modify stored cards and refreshes with the referenced content.

## Generic difficulty profiles

Both Study modules use the canonical `difficulty_level` field. Their identical normalizer and contract tests read `data/library/difficulty.json`; labels, ordered options, source tag mappings, basic-layer defaults and transformation requirements are data. Japanese presents JLPT N5–N1; English uses its existing beginner/intermediate/advanced categories. Unknown values remain unclassified. The host ranks declared fields without language-specific rules or alternate field names.

## Mark every opened card as viewed

Opening a detail popup through a direct link, relationship or previous/next navigation records the canonical card for the authenticated user. Opening its editor follows the same path. Successful writes clear matching preview markers and local state; concurrent hover/open writes are coalesced, and failures remain retryable without blocking the detail view. Failed or cancelled opens do not mark unseen cards, and an opened detail never displays a stale New pill.

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
- [8d2b4358](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2b4358c176a447bb60e9248f40c1234f8cb143)
- [e4f406f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4f406f16a3f0635a6f25206d19d19706cedbbbc)
- [a7891aaa](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7891aaa8195180c45fa490ada5469d2d306c62b)
- [b8a1852e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8a1852e1f4aa45ce950ad49484f818c713341d2)
- [820d53f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/820d53f65816655949a0a1f47068a10cdfc51178)
- [8be331f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8be331f9bc1a54edc80c10e53a4e4d2704a4f7b5)
- [3c72e487](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c72e4870f99213562fb3796b4d76624486ba272)
- [25309509](https://github.com/Cognis-Labs-HQ/Cognis/commit/25309509877018b8d1a4633636f9d45daeef45b4)
- [de20ea2c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/de20ea2c0)
- [92ef5510](https://github.com/Cognis-Labs-HQ/Cognis/commit/92ef5510)
- [b38f8b31](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38f8b31)
- [f9ce159d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9ce159da8ad07c2ff59f913eebab32a69f26921)
- [03dd55f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/03dd55f02c762ae99dc3870322ceb9864cb9e325)
- [e8019a21](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8019a21e12295863fcf009a52385c85069498de)
- [806058fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/806058fe26c0d127f0bacf034530b1023131d380)
- [3c0d5766](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c0d57662df962ac6b5d93f793e0c8de91e1856b)
- [748063b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/748063b10cc208747832e7880098858db648a415)
- [e96d273f](https://github.com/Cognis-Labs-HQ/Cognis/commit/e96d273fa56edd2c2ded09ca993724437ab85c93)
- [66867a1d](https://github.com/Cognis-Labs-HQ/Cognis/commit/66867a1d08a247fa73824aeba982ccba1f9b5d8c)
- [c113e7a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/c113e7a1f5cb7bc2a86c39b8f419ae6b953de9e3)
- [af8bb812](https://github.com/Cognis-Labs-HQ/Cognis/commit/af8bb812d7c31626d877114ce657ca664bf4fe9f)
- [f9740de0](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9740de0c23433da63e296677b64f21540da44db)
- [f90334ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/f90334ced0dc442d6e0c1627704cd36984128910)
- [52002ada](https://github.com/Cognis-Labs-HQ/Cognis/commit/52002ada74f6d3a6e80ee796e2348128434b524c)
- [43d7b6f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d7b6f7eee4628e6fcca5b8c72e1ba49158c290)
- [83f2805c](https://github.com/Cognis-Labs-HQ/Cognis/commit/83f2805c9a325388982ba9e6fb90c397cbe27ab1)
- [d0698b48](https://github.com/Cognis-Labs-HQ/Cognis/commit/d0698b4841827ab1b31f559fe8054627f2bdb09d)
- [efb6dab8](https://github.com/Cognis-Labs-HQ/Cognis/commit/efb6dab89990bdff8b597eed1c71b6230d9c730a)
- [00304cc2](https://github.com/Cognis-Labs-HQ/Cognis/commit/00304cc21874f59ce90b0c5ba830e174e9b62d88)
- [8def0536](https://github.com/Cognis-Labs-HQ/Cognis/commit/8def053668ba80829faeaad2f98adde9e930a24f)
- [aaa01bce](https://github.com/Cognis-Labs-HQ/Cognis/commit/aaa01bce537f12ef50b41e4064cd6157882d469f)
- [95b8d963](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b8d963272d72bdf553e5da03be4b1ae7cc91e6)
- [b20b903a](https://github.com/Cognis-Labs-HQ/Cognis/commit/b20b903a601346b5d23df2bde9620ccffdd41e50)
- [9022b8fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/9022b8fe67d2c5cbcaaae8afb429b7bc426893e4)

Optional single-select fields include a localized **Not specified** choice. Editing an unclassified card therefore preserves its unknown difficulty instead of silently selecting the first level.

Implementation reference: [`1eae7cd32a771b2d5cab37e5e1b9a981851ca3ab`](https://github.com/Cognis-Labs-HQ/Cognis/commit/1eae7cd32a771b2d5cab37e5e1b9a981851ca3ab).

The deck sidebar scrolls independently within the visible page height, keeping long deck lists from expanding the page or pushing practice below the fold.

Page overlays mount at the document body to keep viewport positioning independent of workspace backdrop filters and containing blocks. The drawing pad remains bounded to the visible page and retains its dragged position while scrolling.

Opening another deck brings its content into view immediately; returning from Explore preserves the saved practice position.

Implementation reference: [`23555ea0ac51246cd349ad1534991d78c4810f2a`](https://github.com/Cognis-Labs-HQ/Cognis/commit/23555ea0ac51246cd349ad1534991d78c4810f2a).

Dictionary search-context reads use `study:library:readSearchContext` with authorize and resolve stages. Writes retain `study:library:searchContext` and add validation before persistence, allowing flow extensions to adjust input before service validation. Both operations reject shared-link principals. Writes stop at 16 KiB with HTTP 413; malformed JSON returns HTTP 400 and does not replace saved state. Unexpected failures expose only a stable error code.

Implementation reference: [`d88441ce8a0bedb3c6c03488b0ad7ede5a2fdfac`](https://github.com/Cognis-Labs-HQ/Cognis/commit/d88441ce8a0bedb3c6c03488b0ad7ede5a2fdfac).

## Component isolation and lifecycle

The API delegates extension namespaces through active gateway-owned policies; Study owns the language namespace rules. Library provider capabilities withdraw when the adapter or its Study dependencies are disabled, reject retained handles, and return when enabled. Study adapter bootstrap exposes `onAvailabilityChange(listener)` for lifecycle-bound contributions; failed bootstrap withdraws them.

## Notification and persistence fixes

Library content and deletion announcements include English, German, Indonesian and Japanese text from XML catalogs, use English fallback, and run through `study:library:notifyContent`. Card labels remain opaque during interpolation. Privileged class writes still require a real target class. Leaderboard observations roll back on failed persistence; season rollover rebuilds final standings after restart and restores state if saving fails. Verified administrators can release matching integration source bindings without room membership.

## Behavioral test boundaries

Browser tests load actual module exports with explicit dependency fakes through shared tooling. Editor, drawing and flow checks exercise public operations rather than extracted private functions. The deck editor now has a dedicated owner module used directly by Flashcards.

Implementation: [b2bbcf43ddfcdcfa9ae780cf33aab1c7527a2f61](https://github.com/Cognis-Labs-HQ/Cognis/commit/b2bbcf43ddfcdcfa9ae780cf33aab1c7527a2f61).
