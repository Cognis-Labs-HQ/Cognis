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
