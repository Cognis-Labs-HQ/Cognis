# Study Library selection, request filtering, and safer audio authoring

**Feature Branch:** work

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

## Commits

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
