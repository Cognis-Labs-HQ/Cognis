# Study language packs

## Overview

Study languages are declarative content packs. They contain a manifest, a consumer-defined Library schema, language records, and documentation. They do not contain browser UI, API routes, stores, CSS, or language-specific page components. Cognis Study adapters generate interfaces from schema roles and presentation metadata.

## Package contract

A package may use a minimal bootstrap entry point only to resolve its installed root and call `study:library.ingestContentPack(root)`. It must obtain that capability through `ctx`; it must not import Library internals. In environments that expose declarative module resources directly, no executable entry point is necessary.

```ts
export async function bootstrapLanguageModule(ctx, moduleRoot) {
    const library = ctx.capabilities.require("study:library");
    await library.ingestContentPack(moduleRoot);
}
```

The Library adapter owns file discovery, path safety, validation, stable IDs, transactions, idempotency, logging, and persistence. Resolver algorithms and remote dictionaries are separate Study adapters that contribute hooks or lookup providers through `ctx`.

## Required structure

```text
cognis-language-ja/
  package.json
  manifest.json
  schema.json
  content/
    characters/
      hiragana.json
      katakana.json
    symbols/
      common.json
    definitions/
      core.en.json
    words/
      beginner-01.json
    sentences/
      beginner-01.json
  docs/
    standard.en.md
    standard.de.md
    standard.id.md
    standard.ja.md
```

`manifest.json` contains `id`, `publisher`, `version`, `contentRevision`, relative `schema` and `content` paths, and a required license descriptor. Paths must stay inside the package root. Reusing a publisher, pack ID, and version with different bytes is rejected.

```json
{
    "id": "japanese-core",
    "publisher": "Example Publisher",
    "version": "1.0.0",
    "contentRevision": "2026-09-05",
    "schema": "schema.json",
    "content": "content",
    "license": { "id": "CC-BY-4.0", "url": "https://example.com/license" }
}
```

## Schema

The schema declares a stable ID, positive integer version, BCP 47 language, localized display label, and any number of layers. Layers declare typed fields and directed relationships. Relationships specify target layers, minimum and maximum cardinality, ordering, and optional resolver. Layer names are consumer-owned; English may define letters, Korean may define Jamo and syllable blocks, and a signed language may define handshapes and movements.

A schema version is immutable. Change the schema version when a layer, field, relationship, or constraint changes. A content-only correction increments the package version or content revision without rewriting the schema.

## Content files

Each immediate directory under `content/` exactly matches a schema layer ID. Every `.json` file contains either an array of records or `{ "records": [...] }`. Sharding has no semantic meaning; use small topical files for compact layers and bounded shards for large dictionaries.

```json
[
    {
        "id": "word:nihon",
        "label": "日本",
        "fields": { "reading": "にほん" },
        "references": [
            { "entryId": "symbol:日", "relation": "spelling", "position": 0 },
            { "entryId": "symbol:本", "relation": "spelling", "position": 1 }
        ]
    }
]
```

Record IDs are stable within the pack and are the only valid relationship targets. Cognis derives collision-resistant internal IDs from publisher, pack, and record IDs. Every referenced record must be present in the same validated pack. Fields, targets, cardinality, and ordering must satisfy the schema before any data is written.

## Ingestion lifecycle

`inspectContentPack` resolves safe paths, parses files in deterministic order, validates the complete graph, and calculates a digest without writing. `ingestContentPack` registers the immutable schema and writes all records, edges, and the installation receipt in one transaction. Reinstalling identical bytes is an unchanged success; changing bytes without changing the package version is an error.

Imported content is global and records its pack origin. Class and user material remains an overlay managed through normal Library operations. Large reference corpora should be split into dedicated lookup adapters rather than bundled when eager materialization would be unreasonable.

## Generated interfaces

Core Study adapters inspect schemas and render compatible browser, detail, writing-system, lexicon, sentence-composer, and relationship views. Content packs may eventually provide declarative semantic roles and presentation hints, but never executable templates or CSS. All entry navigation uses `/study/library/:schemaId/:layerId/:entryId` and the Study gateway UI client.

## Author checklist

- Keep all language facts under `content/`; never embed them in bootstrap code or UI.
- Use stable IDs and explicit ordered relationships.
- Translate pack documentation and display metadata.
- Declare sources, licenses, attribution, and revisions.
- Validate the whole pack before publishing.
- Put tokenizers, Hangul decomposition, morphology, audio, and external lookups in ctx-connected adapters when they require executable behavior.
