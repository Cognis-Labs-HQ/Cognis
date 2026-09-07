# Library Adapter

## Consumer-defined schemas

The Library adapter stores generic, related study records. Consumers register immutable, versioned schemas through the `study:library` ctx capability. A schema defines its language, layers, typed fields, and directed relationships; the adapter does not own names such as alphabet, word, or sentence.

Relationship definitions declare their target layer, cardinality, ordering, and optional resolver. Every write validates fields, schema version, targets, scope visibility, and cardinality before persistence. Alternate definitions are modeled as consumer-declared layers and relationships.

## Resolution and lookup

The `grapheme` resolver uses Unicode grapheme clusters and the `longest-match` resolver uses explicit whitespace-delimited blocks. Both return proposals and unresolved units without silently creating entries. Sentences and other ordered structures use stored relationship positions as their identity.

Consumers can contribute lookup providers with `registerLookupProvider`. Providers declare whether they support a schema and layer, then return ranked suggestions with provenance. Removing the returned registration callback disables that provider without coupling the adapter to its implementation.

Create, resolve, and lookup operations participate in named ctx flows so consumers can add removable normalization, proposal, validation, enrichment, or ranking hooks.

## API and UI

The Study gateway exposes schema discovery, generic entry listing and creation, entry details, bidirectional tracing, resolution previews, and lookup suggestions. Browser requests are centralized in the Study gateway Library client.

The schema-driven page hides implementation-only definition and particle layers from direct browsing. Browseable layers use tabs, metadata filters, entry cards, metadata pills, and scope icons. Reusable popup details show definitions and meanings beneath the larger item heading. Recognized constituent entries, including sentence particles, appear as navigable sub-boxes inside that heading instead of a separate Components section, while particle details remain read-only. Metadata filters appear as immediately applied pills and use schema detail groups when a module supplies them.

## Access

Global records are readable by authenticated users and writable by admins and owners. User records are private. Class access is delegated to the Classes capability. Relationship targets must be visible to the writer and must use the same schema version.

## Declarative content packs

Installed language packages call `inspectContentPack(root)` to validate or `ingestContentPack(root)` to install a data-only Library. Each root contains `manifest.json`, a referenced schema file, and a content directory whose immediate subdirectories match layer IDs. Files contain record arrays with stable IDs and explicit references. Cognis validates the complete graph, derives namespaced IDs, records a digest and receipt, and writes the schema, entries, and edges atomically. The full authoring contract and example tree are documented in `study-language-framework.en.md`.

## Localized definitions

Every layer with the `definition` semantic role declares its module-owned string-key prefix and its string-key and localized-text fields. Definitions are managed only while editing entries that require them; they are not directly browseable or editable as independent Library sections. English remains the required source text, generated keys remain on definition records, and the optional `localization:translateString` capability can fill omitted languages.

## Writing-unit pronunciation and audio

Layers with the `atomicWritingUnit` or `compoundWritingUnit` role declare required standard `pronunciation` (`stringList`) and `audio` (`audio`) fields. Content packs may supply MP3, Ogg, WAV, WebM, or M4A files, or an HTTPS URL. Local files remain authenticated pack assets. Remote audio is fetched through the entry-authorized Library route and restricted to public HTTPS hosts and supported audio media types. The Library registers a component-managed `study-library-audio` namespace with the Files gateway and stores each URL once under a deterministic key without an adapter-level size limit. Persistent storage, quotas, and physical file handling remain the Files gateway's responsibility, while every playback request still enforces the entry's scope.

## Metadata filter groups

A badge field can set `detail.group` to place related filters together and `detail.exclusive` to control selection. When every field in a group declares `exclusive: true`, choosing a pill clears the group's previous choice. The default `false` permits multiple selected pills. Every field in a named group must use the same exclusivity setting.
