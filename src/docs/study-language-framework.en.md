# Study language packs

## Purpose

A Study language package is an external, immutable data release. It contains a manifest, one versioned Library schema, records, optional assets, licenses, and localized documentation. Packages never contain language records in Cognis core, executable renderers, routes, CSS, or provider-specific storage code.

## Package layout and manifest

A package provides `manifest.json`, the referenced schema file and content directory, and optionally an assets directory. All paths are relative slash-separated paths without empty, absolute, parent (`..`), backslash, or symlink escapes. Content shards are read by layer and filename in lexical order.

The manifest declares `id`, `publisher`, `namespace`, semantic `version`, `contentRevision`, `schema`, `content`, optional `assets`, and `license`. The license has a machine-readable ID and may have an HTTPS URL and attribution. The package owns exactly the namespace named by both manifest and schema; every record ID starts with `<namespace>:`. Publishers must release changed bytes under a new package version.

## Neutral schema contract

Schemas have an immutable positive integer version, BCP 47 language tag, namespace, localized labels and descriptions, and arbitrary consumer-named layers. Cognis assigns no meaning to layer IDs. A layer may instead declare a semantic role: `atomicWritingUnit`, `compoundWritingUnit`, `lexicalUnit`, `orderedLexicalSequence`, `passage`, `definition`, or `practicePrompt`.

Fields have localized metadata and one of the types `string`, `number`, `integer`, `boolean`, `localizedText`, `stringList`, or `asset`. They can be required and carry detail-rendering hints for renderer, order, group, and visibility. Layer detail hints may select a title field and field order.

Relationships have localized metadata, a target layer, minimum and maximum cardinality, optional ordering, a required-target constraint, and mandatory deletion behavior (`restrict`, `detach`, or `cascade`). Resolver roles (`grapheme`, `token`, `longestMatch`, or `explicit`) describe intent without embedding algorithms. Ordered references require unique non-negative integer positions.

Layers may publish activity-compatibility roles and interest veins as namespaced camel-case role identifiers. These are discovery tags, not executable hooks. A layer can also declare an optional SVG or JSON stroke asset field and coordinate system. Asset fields contain package-relative references under the manifest's assets directory. During atomic ingestion, Cognis stores validated asset bytes with their immutable package identity and replaces record values with authenticated Library asset URLs.

## Records and references

Each immediate content subdirectory matches one declared layer. JSON shards contain an array or `{ "records": [...] }`. Records contain a namespaced stable `id`, display `label`, typed `fields`, and references. Every target must exist in the same package and schema version, target the declared layer, and meet cardinality, ordering, and required-target constraints. All language facts remain in these external record files.

## Deterministic atomic ingestion

`inspectContentPack` performs a read-only preflight: it checks the manifest, semantic version, license, safe paths, namespace ownership, schema references, typed fields, the complete relationship graph, and every asset reference. It hashes canonical manifest, schema, record data and referenced asset bytes in deterministic order. A failure produces no writes.

`ingestContentPack` persists the validated schema, records, relationships, and receipt in one database transaction. Schema IDs and versions are immutable. Reinstalling an identical publisher/package/version digest is idempotent; different bytes for that identity are rejected. Interfaces consume semantic roles and rendering hints, while resolver and activity adapters participate through `ctx` flows.

## Author checklist

- Keep all records and assets outside Cognis core.
- Use stable namespaces, record IDs, semantic package versions, and immutable schema versions.
- Localize schema, layer, field, relationship, and documentation metadata.
- Declare license, attribution, relationship deletion behavior, and exact constraints.
- Run inspection before publishing and never depend on content shard enumeration order.
