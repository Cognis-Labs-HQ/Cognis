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

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
