# Per-user tracking for new Study Library content

**Feature Branch:** feature-update-external-package-contract-definitions

## Persistent viewed-content cache

Cognis now stores viewed Library entry UUIDs per account. Hovering a card or opening it directly or through a relationship marks it as viewed without exposing another user's history.

## New-content indicators and notifications

Unviewed entries display a one-time **New** pill in previews and detail popups. Provider updates and approved global contributions notify enabled users when new language content becomes available.

## Scoped contributions and review workflows

Users can create personal cards, teachers can also create cards in their own classes, and administrators can create global cards. Promotion requests now move approved cards to teacher-owned classes or the global collection, while authorized downgrades return them to the original submitter. Provider-protected cards cannot be moved or deleted.

## Searchable and configurable Library UI

Language providers can shape layer-owned creation fields through a ctx capability. Global duplicate detection pauses creation for confirmation, imported records carry a persistent search index, Library search spans every layer, optional preview definitions render below card content, and multi-select controls now occupy the requested card-edge positions with restored floating actions.

## Language-defined creation is complete

Language packs can now declare a validated `cardConstructor` for each creatable layer, or register one through the public `study:library:provider` ctx capability. Cognis composes the provider fields with role-aware visibility and class controls, shows class selection only when needed, and exposes review requests to authorized teachers as well as administrators.

## Bounded card status and contextual publishing

Card-edge scope, New, and selection controls now stay within each card’s horizontal bounds, while constrained previews reserve most space for their primary value. Multi-select now offers a hoverable Publish to menu, a real localized delete label, pending-request withdrawal, and authorized send-back actions without a redundant close button.

## Concise links and smarter discovery

Related-item controls now show only each card's primary value. Child cards have clearer surfaces, stronger background separation, and independently hoverable New markers. Detail popups suggest similar same-layer items using writing, vocabulary metadata, and shared relationships, while language providers can expose additional metadata fields as learner-facing filters.

## Authoritative external package contract

The Study Library now validates and preserves localized and provider metadata, extensible declaratively validated field types, asset lists, package ownership and protection, semantic presentation, definition localization, interests, and activity compatibility. A synthetic package fixture mirrors a production provider structure, and the public provider capability can inspect a real pack without installing it.

## Library browsing and provider lifecycle fixes

Library search and edit controls now follow compact, theme-safe styling. Right-click selection is captured reliably, nested child cards retain hover hitboxes, and non-character cards show full readings and definitions without needless truncation. Content providers now authoritatively control language availability. Content records support namespaced classes, media lists survive ingestion, custom editors follow validation contracts, built-in constraints are enforced, and installation receipts retain provider metadata.

## Stable Library controls and balanced sentence cards

Sentence cards now use a consistent bounded height, omit redundant pronunciation previews, and clamp primary text and definitions to two lines. Search exposes one controlled clear action, edit icons render from explicit themed assets, deletion dialogs have localized labels, and vocabulary details include kana readings. Right-click selection is captured at the document boundary on every mounted Study page, while authoritative provider upgrades prune records omitted from the latest pack unless a partial pack explicitly opts out.

## Dedicated publishing-request navigation

Publishing reviews now live on a dedicated Requests page in Study sub-navigation instead of consuming Library page toolbar space. Reviewable pending requests give the Requests link a red breathing outline with a reduced-motion fallback, and the signal clears when the final review is resolved. The Library search clear icon now adapts to both light and dark themes.

## Language-scoped administration and guided card editing

The Library administrator now shows a flat layer menu for the selected language. Card classes are visible and safely editable, definitions and composites receive enforced classes, definitions stay learner-hidden, particles and provider-locked records cannot be edited, and edit dialogs provide clear View/Edit modes, Save actions, and unsaved-change protection. Card creation moved to a guided `+` page action on learner-facing layer pages, request status is available to submitters, popup title readings retain provider links, and Study language availability is refreshed on every page load.

## Reliable learner card actions

Learner cards now keep a selectable control regardless of deletion rights, so right-click reliably enters multi-select without opening the browser menu. Creation actions now discover provider-contributed card constructors and register the + control through the page-action CTX capability.

## Localized Requests navigation on first load

The Requests navigation item now receives localized fallback labels from its owning Library route, so a fresh server or browser load never exposes the internal `/study/library/requests` path while translation bundles are still loading.

## Ordered sequence relationship roles

Content-pack validation now reconstructs ordered sequence labels only from composition relationships. Pronunciation and alternate-spelling relationships can target lexical records and use their own position sequence without causing `ordered_sequence_content_unresolved`, matching the Japanese learning provider contract.

## Clear content-class and reverse-link details

Detail views now hide the structural composite class, humanize provider class suffixes into pills, and use a two-column composite heading with readings below the primary text. Same-label reverse vocabulary links are suppressed without removing the authored forward spelling relationship.

## Focused child-card branches

Opening a child-card branch now blurs unrelated cards’ visibility icons and neutralizes hover elevation and highlight styling on other parent cards. The active branch remains crisp and interactive.

## Safe same-owner schema evolution

New releases of an authoritative content pack can now revise their own stored schema at the same compatibility version. Ownership checks retain schema collision protection, and the schema cache updates only after transactional ingestion succeeds, allowing the latest Japanese pack to enable cleanly over its previous release.

## Reliable multi-select controls

Study Library now keeps its floating action menu available whenever cards can enter multi-select mode, including views without deletable provider records. Selection checkboxes also use a pointer cursor so their interactivity is visually clear.

## Disabled languages and durable learning state

Disabled language modules are now absent from Study even if a stale provider capability remains during lifecycle refresh. Content-pack updates preserve viewed-entry tracking and notify accounts only for genuinely new stable records instead of announcing the full pack again.

## Deduplicated linked title details

Library detail headings now compare normalized text and link targets across the primary title and its secondary spelling details. A spelling already linked in the primary title is omitted from the detail line without suppressing same-text links to genuinely different records.

## Dependency-only reading relationships

The external-package contract now treats relationships without resolver and presentation roles as dependency-only edges. They remain persisted for reverse navigation and deletion protection without being inferred as title composition, matching the Japanese provider’s `reading-kana-dependency` graph.

## Unified reverse relationships

Library details now combine vocabulary usage and other inbound dependencies into one Used By section. Visually duplicate normalized labels collapse into one link, with vocabulary relationships taking priority.

## Balanced title alignment

Composite popup titles now sit closer to their reading detail through a compact row gap. Card preview titles, readings, and definitions remain centered when relationship deduplication removes an adjacent item.

## Predictable multi-selection

Selecting every visible card now changes the floating action to Deselect All, and deselecting or leaving the SPA page cleanly exits multi-select mode.

## Focused request browsing

The Requests page now offers status and ownership filters, with the review queue shown only to administrators and teachers.

## Safer card authoring

Audio is optional and uploaded under a deterministic card-derived key, tag entry no longer submits forms, Cognis checkbox styling is applied, cancel actions use destructive styling, and character-layer records cannot be created or edited.

## Natural Library scrolling

Library surfaces now opt into the page composer's natural scrolling behavior.

## Guided composite-card designer

Composite cards now use ordered horizontal carousels for each relationship layer. Every carousel keeps its create action visible and can open a nested card composer, allowing authors to create a missing component and return without losing the parent draft. Free-text composition previews matching components and highlights unmatched text.

## Safe composition visibility and audio playback

The service now rejects composites whose referenced parts are not visible in the composite's destination. Invalid legacy audio placeholders no longer trigger failing audio requests.

## Reliable Select All toggle

Select All now has an explicit action state instead of inferring its click behavior from checkbox state. Its first activation selects every visible card and changes the action to Deselect All; only the latter exits multi-select mode. Visible-card detection now works in both learner cards and administration rows.

## Guided layer and unmatched-text creation

The creation flow now starts with a permitted card-type selector. Unmatched free text is actionable: choosing it opens the appropriate nested composer with the missing text already copied into the card label.

## Scope-aware editing and update review

Administration rows now open only the administration editor and retain their independent edit controls. Learner-facing detail dialogs show a top-right edit action only for eligible records: owners may edit their own cards, administrators may edit global cards, and protected provider content remains immutable. Author edits to globally published cards are stored as update requests and applied only after approval; Requests now identifies these separately and retains completed status history.

## Creation action availability

Every learner-facing non-character layer now contributes its create action, with a generic schema-driven constructor available when a provider does not supply a specialized constructor.

## Disabled language providers disappear immediately

Study now intersects saved learning-language preferences with the gateway's current enabled-provider registry before rendering settings, dashboard cards, search groups, or sub-pages. A disabled provider therefore disappears from both Active Languages and the Study dashboard without deleting the stored preference, so it returns naturally if an administrator enables the provider again.

## Visible class and editing controls

Composite and ordered sentence details now always show a readable class pill, including a Composite fallback for older records without a stored class. Library administration restores an edit control for every visible record and permits administrators to edit provider-managed records there. Learner cards now show an edit affordance when the server grants user-facing edit permission, and eligible detail popups expose the same action in the top-right header. Server-provided permission hints keep global administrator edits, owner edits, and review-required author updates consistent without relying on stale browser role state.

## Expanded keyring payload capacity

The default encrypted keyring vault capacity is now 2,000 MiB, one thousand times the former 2 MiB cap, so large encrypted audio-backed secrets can be persisted without a 413 response.

## Structured card authoring and editing

Card edit controls now appear only inside detail dialogs and use the theme-aware edit asset. The wider editor separates content, relationships, and aggregate definitions into tabs, while localized definitions expose every supported UI language and linked definitions can be edited in place. Creation now derives labels from resolved composition parts, requires unmatched text to be resolved or created, restores the horizontal carousel stylesheet, and enlarges the theme-aware create action.

## Refined creation controls

The Library create action keeps its normal button footprint while doubling only the plus glyph. Creation tabs now initialize correctly, personal scope is the default, eligible administrators can opt into publishing globally, and teachers see a class-publishing option only for writable classes matching the active language. Content class uses a role-aware dropdown only where relevant, the composition field is labelled Input, and focusing it reveals the relationship carousels.

## Smarter permanent composition

Relationship collections now show every item without scrollbars or direction arrows. Hover previews show a minimal card with the current-language definition, while carousel choices and free-text suggestions immediately become draggable Input blocks. Reordering blocks updates relationship order, selected content infers related references, pronunciation walks referenced writing units, and definition creation requests every supported UI language.

## Integrated composition workflow

Resolved cards now live inside Input, pronunciation updates while typing, duplicate carousel labels collapse, and previews escape dialog clipping. Relationships use a read-only hierarchy, definitions can be created as repeatable all-language sets, publication has clearer review guidance, and user authors no longer see the administrative Hidden control.

## Drawing-aware cards and safe definitions

Definition records can now be created only as linked children of another card, and composer closure uses shared data-loss protection. Compact speaker controls play complete composite audio sequences only when every component is available. A new validated stroke-pattern contract powers a PiP drawing adapter with ordered stroke scoring, live progress, undo/reset, and adjustable guidance.

## Deployable Drawing adapter

The Drawing adapter now declares its TypeScript package entrypoint and tested Study gateway dependency, so production server-build validation can import it successfully.

## Precise compact card composition

Relationship carousels now occupy exactly two vertically scrolling rows and hover previews use the viewport-aware anchored popup. Exact whole-input matching replaces character-by-character inference, preventing unrelated relationship nodes. Definitions use a dedicated all-language dialog rather than a carousel or nested card composer, while publish/create controls, theme-aware audio, drawing/edit affordances, and action tooltips have been polished.

## Adaptive drawing and horizontal carousels

Two-row carousels now scroll horizontally, stroke payloads stay out of card details, and drawing closes the source dialog. Theme-aware drawing assets and pad colors improve contrast. The resized PiP fits its complete canvas and controls, while uniformly resampled path scoring supports complex characters and automatically adjusts guidance from success rate plus learner difficulty feedback.

## Library scrolling and nested creation

Study Library pages now use natural document scrolling and consistently sized card previews. Carousel previews remain content-sized and disappear cleanly, while each add control opens a correctly stacked, type-locked composer with the card type in its title. The primary create action now shares the standard theme and language control styling.

## Pronunciation links across relationships

Pronunciation detail links now consume the provider-declared `input.linkRelationships` array. References from vocabulary and particle relationships are merged by authored position, and each displayed segment resolves against the referenced card’s label and pronunciation aliases while preserving the original card as the navigation target.

## Automatic drawing feedback

The drawing pad now keeps stroke counters and guidance controls out of view. It starts with the complete guide, progressively restores guidance from the current through final strokes after repeated mistakes, shakes red for an incorrect stroke, and celebrates a completed character with a green shake and generated success chime.

## Focused drawing guidance and themed controls

Drawing practice now guides only the current stroke, progressively shortens guidance after success, and expands that same stroke after mistakes; Reset preserves the diminished guidance and Undo is removed. The pad aligns card text with its definition, sizes Close to its content, and animates opening and closing. Library creation uses a themed two-rem plus, provider target-layer carousel headings and content, and app-theme-aware speaker assets.

## Aligned and canonical drawing output

The Drawing heading now matches the canvas width and sits directly above it. Feedback shakes are gentler, and accepted user strokes are replaced with the provider’s canonical paths so a completed character renders correctly.

## Stable drawing and card authoring

Drawing guidance now displays only complete canonical strokes, schedules canvas updates per animation frame, and keeps accepted output canonical. Library view tabs remain interactive, nested composers honor the relationship target type, compound characters accept free labels with atomic pronunciation relationships, duplicate target carousels are removed, tags are editable, and carousels hide their scrollbar.

## Provider-assisted composer lookup

Compatible content providers can now register localized lookup services through the public Library ctx capability. The card composer displays one action per service, sends that service the raw input, and applies its highest-confidence canonical label, fields, and ordered references.

## Public capability enablement

Module enablement now recognizes public server capabilities contributed through the system ctx. Japanese and other language modules can require `study:library:provider` without receiving a false unavailable-capability conflict, while private capabilities remain hidden.

## Reliable Library forms

Card updates now preserve unordered references without invalid positions. Relationship tabs are view-only, compound characters use a free Input field and pronunciation carousel, lookup actions appear inline after typing, stroke patterns stay provider-owned and hidden, definition add controls are larger and neutral, and hover previews fully enclose their content.

## Reliable built-in card editing and packaged audio

Library updates now use the database gateway's structured update contract, so editing built-in cards no longer fails inside PostgreSQL. Audio playback is offered only for files shipped through a content pack and stored by the Files gateway; external placeholder URLs are neither displayed nor fetched. Definition summaries show localized translations in a compact language-labelled layout instead of exposing provider keys and raw JSON.

## Stable drawing completion

Drawing feedback now animates only the canvas stage, so ending an animation cannot replay the pad's opening transition or make the window flash. A new attempt begins with the complete character guide, then advances one full stroke at a time after the first accepted stroke. Completion displays a tick, Well Done message, attempt mistake count, and Close or Try Again actions.

## Audio playback and pronunciation editing

Authenticated pages allow browser-generated media URLs, so newly uploaded card audio can play without violating Content Security Policy. Audio editors show the current filename, and speaker icons follow the application theme. Compound-character pronunciation carousels now replace the tag-entry control inside the Pronunciation field, use provider target-layer names, and number characters by their order in the card text rather than stale relationship positions.

## Provider-linked pronunciation and durable card edits

Pronunciation fields linked to provider relationships now render their ordered selectors directly in the field instead of retaining free-form tag input. Once a user changes a provider-installed card, later provider reconciliation preserves that card and its relationships.

## Two-step pronunciation composition and stable audio

Pronunciation editors now choose semantically compatible component cards, preview card pronunciations, and commit each derived reading before composing another. Carousel previews fully contain their text, audio controls remain visible in every theme, and replacement audio uploads reuse a stable card-specific key.

## Guided stroke order and adaptive Drawing Practice

The initial guide now numbers every stroke and draws a direction arrow. Ten consecutive mistakes produce a “Loser!” result with an X, while completing a card with zero or one mistake raises its remembered in-memory difficulty. Selecting another drawable Library card while the pad is open loads it directly into the same pad.

## One-time guidance, composite practice, and shared audio

Full drawing guidance now appears only on the first attempt or after the explicit ? reset. Retry preserves progressive guidance, while composite cards derive ordered character stroke groups and preview each newly reached piece. Lexical and sentence cards cannot own stroke patterns. Provider alternate characters reuse related character audio, user uploads remain authoritative, and the speaker uses an inline theme-safe SVG.

## Composite writing and reliable creation

Vocabulary drawing now follows the primary written form and arranges every resolved character side by side while the pad heading includes readings and meaning. Shared form composition now marks required creation fields consistently, preserves provider-supplied stroke patterns, validates alternate characters through dictionary lookup, embeds character pronunciation selectors, and cleans up carousel previews when dialogs close.

## Reliable editing, drawing, and composition

Card updates and audio playback now migrate through the provider’s current schema, and detail dialogs retain their edit action after editing. Drawing practice stays bounded, resizes predictably, annotates single-stroke guidance, uses vocabulary spelling instead of pronunciation, and excludes sentences and composites. Card creation excludes particle cards, restores all composition carousels for sentences and composites, and provides staged character-based pronunciation selectors for vocabulary and alternate characters.

## Precise nested composition

Nested child-card branches now retain their provider-assigned side when they fit, nested creation dialogs always stack above their parent, and pronunciation composition now matches the input composer with a staged text field and atomic-character carousel.

## Provider-directed composer carousels

Card constructors now explicitly separate primary-input and pronunciation carousel relationship IDs. Alternate characters require resolved pronunciation relationships without requiring primary references, lookup results receive safe provider metadata defaults, and child-card placement no longer drops branches when the declared grid has no remaining capacity.

## Strict composer declarations

Removed inferred carousel behavior: every card constructor must declare both carousel arrays. Server validation now uses runtime form constructors, edit forms render the declared pronunciation carousel, audio replacement keys use normalized card names, and diagonal child cards retain their assigned placement.

## Provider-driven carousel restoration

Card constructors now identify input and pronunciation carousel sources by target layer. Cognis maps those declarations only to relationships with the matching presentation role, so pronunciation carousels render again while alternate-character primary references remain optional.

## Review feedback and reliable composer placement

Content-pack pruning is now publisher-qualified, push requests use the database contract correctly, and deletion checks consider only pending requests. Generic constructors, class publishing, raw compound labels, repeated pronunciation branches, nested-definition rollback, unique audio uploads, compatible schema evolution, and removable pronunciation links are reliable. Speaker assets now render through explicit themed images, while relationship carousels live beneath their intended content fields.

## Existing-card carousel editing

Existing cards now derive both input and pronunciation carousel configuration from their provider constructor. User-facing and administrative edit popups render the same ordered carousel controls as creation while retaining existing selections.

## Accurate extended drawing guidance

Drawing annotations now calculate their direction in rendered canvas coordinates, preventing drift on the second and later characters of extended inputs. The ? guidance action preserves accepted user strokes and annotates only unfinished work.

## Collision-aware drawing annotations

Stroke numbers now choose the clearest available position around each start point, avoiding other annotation bubbles and rendered stroke paths so guidance does not cover completed user work.

## Unified creation and editing contracts

Creation and edit popups now consume the same provider card-constructor contract for fields and relationship carousels. Alternate characters can compose pronunciation from characters while keeping unrestricted input; vocabulary, sentence, and composite pronunciation is derived recursively from configured input parts.

## Remove derived pronunciation tags

Vocabulary, sentence, and composite edit forms now suppress the generic pronunciation list control unconditionally and continue deriving pronunciation from their ordered parts. Generic list fields use newline-separated text instead of tag chips.

## Progressive recall drawing

Low-mistake completions now hide one additional random stroke guide per card while retaining normal validation. A canvas question mark signals hidden guidance, the top-right ? reveals it without clearing progress, and annotation labels use closer safe placements.

## Always edit pronunciation with the composer

Visible pronunciation fields now always use the pronunciation composer in create and edit dialogs. Pronunciation carousels declared by the card constructor remain layer-specific and appear inside that composer, while layers without declared relationship carousels can still enter unrestricted pronunciation segments.

## Derived audio sequences with clear missing-audio feedback

Vocabulary and sentence cards without their own upload play the audio of their ordered parts in sequence. An optional card-level upload overrides the derived sequence; when a dependency lacks audio, a localized hover tooltip explains why the speaker is disabled.

## Carousels connected directly to pronunciation

The unified composer interface now adds relationships implied by input or pronunciation carousel layers to the effective constructor automatically. Pronunciation carousels therefore load reliably in create and edit dialogs, and their selection updates the hidden pronunciation field immediately without a separate free-text field or commit button.

## Pronunciation carousels restored from schema relationships

When a visible pronunciation field receives no carousel layers from its runtime constructor, the unified composer now uses the target layers of every declared pronunciation relationship. The Kanji composer therefore renders its character carousel even for legacy contributions with an empty `pronunciation_carousels` array.

## Semantic carousel profiles match the authoring contract

The composer now normalizes card constructors to the requested semantic profiles: alternate characters receive free Input plus character Pronunciation; vocabulary receives character, alternate-character, and vocabulary Input plus character Pronunciation; sentences receive particle, alternate-character, and vocabulary Input with no editable Pronunciation. Vocabulary pronunciation is pre-populated down to the character layer, while sentence pronunciation is derived exclusively from it.

## Characters and particles are immutable

Atomic characters and particles can no longer be created, edited, submitted for update, or deleted through either the UI or direct API calls. Permission projections remove edit and delete actions even for administrators and owners, while entries remain available for read-only browsing.

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
- [d3ba08ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3ba08ef)
- [6d6e4e53](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d6e4e53)
- [5f8b129c](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f8b129c)
- [9c374e3f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c374e3f)
- [05838355](https://github.com/Cognis-Labs-HQ/Cognis/commit/05838355)
- [a0016fcd](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0016fcd)
- [0287eb84](https://github.com/Cognis-Labs-HQ/Cognis/commit/0287eb84)
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504
- https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea81a944257040a042c1d0c0c9b2447768390221
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b51abc17cc6ed3a75921bfa242d16c33aae2ce0
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2e2d092813312978c2f69640389f6401ec0230f5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/cff7223cd64c36372e64484c362ba9b1a1f4e2f7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbb6bb8bd8e2d70a6ec571c2a69e58665a90ca04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e1e564bf66580e7a1e8eaf24080c646f686d982c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/344ccb5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/40da0c7a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/584fb0b46ebb77bd43e585b3b41a279a0e6e9bfa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d597603b3b1faf6df9d5c7a98973362312236d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/61002cd2578510ff6d823b8ebb454364e2c930cd
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dac803472e1dfc8a5bb2acf3082da88dad8a05
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6aa6fe85403331903570c9cd20f115ea48576be
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1337d0a332a5ccb2d1081816d55e453f90a0c0bc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/eda8cb2ab208b458f73e79f5b89fd6413ccbab77
- https://github.com/Cognis-Labs-HQ/Cognis/commit/337b23512bb9fd25e0ffce0d94058e4dcc959e84
- https://github.com/Cognis-Labs-HQ/Cognis/commit/67b413b535c0a8662cfe92c1170ccfc4742e6eae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8893689
- https://github.com/Cognis-Labs-HQ/Cognis/commit/79cbfa05a5409f780bb42f4ea5ac7c0f8ec67f01
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e4daa661ee08b05a48ecba33182c490d4352e660
- https://github.com/Cognis-Labs-HQ/Cognis/commit/274fc626dbea45d3c8d66c82b98f1a0ba87a8052
- https://github.com/Cognis-Labs-HQ/Cognis/commit/024d7dfe05f713f390d7b9fb00410591018c9bf6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/281d2ac4dca994692513c8069ad21fe9affebedc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f5214c148cab6eac78e3f8ee8aed3847ffba2201
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bec24655948ca3a64ea6ab4f95f7897aecee68ac
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1501e390dce637fb660c5b540a4235e3e7c98f29
- https://github.com/Cognis-Labs-HQ/Cognis/commit/71c842e2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3f72cfb6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/47821a9b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f2afaa13
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e894f166
- https://github.com/Cognis-Labs-HQ/Cognis/commit/64d1ac04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/23587bd7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8c8deb9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48d14c1ba63d887a04305306f8c9de7565361dfa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/872484294f2d3b777c6123286db62c78dc08f7f8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/452e3eb3fc5b9e2ca86464904e7f6477992b7c32
- https://github.com/Cognis-Labs-HQ/Cognis/commit/039dc5c1
- [8b08718f](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b08718f)
- [7841f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/7841f27)
- [9aedc46](https://github.com/Cognis-Labs-HQ/Cognis/commit/9aedc46)
- [f405a3e](https://github.com/Cognis-Labs-HQ/Cognis/commit/f405a3e)
- [641d87a](https://github.com/Cognis-Labs-HQ/Cognis/commit/641d87a)
- [bbed779](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbed779)
- [efd006d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/efd006d2)
- [fb046ce2](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb046ce2)
- [004b39e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/004b39e5)
- [3e48b191](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e48b191)
- [5cd8e7ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cd8e7ff)
- [b00c41df](https://github.com/Cognis-Labs-HQ/Cognis/commit/b00c41df)
- [a0af7d1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0af7d1a)
- [54242971](https://github.com/Cognis-Labs-HQ/Cognis/commit/54242971)
- [125495f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/125495f3)
