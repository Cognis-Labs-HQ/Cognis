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
