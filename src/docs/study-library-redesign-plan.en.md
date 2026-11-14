# Library redesign plan

## Direction

Replace the fixed layer catalogue with a schema registry owned by consumers. A language module registers a versioned library schema through `ctx`; the Library adapter remains unaware of concepts such as alphabets, Hangul syllable blocks, words, or exercises. It supplies persistence, relationship validation, resolution orchestration, access control, and generic UI metadata.

A schema contains stable layer IDs, localized labels, field definitions, and directed relationship definitions. Each relationship declares its source and target layers, cardinality, ordering, whether it is required, deletion behavior, and which resolvers may propose links. Schema versions are immutable after data uses them; consumers publish migrations when they need structural changes.

## Contracts and flows

1. Add a `study:library` schema-registration capability to the Study gateway. Language modules register schemas during bootstrap without importing the adapter. Reject duplicate IDs, dangling relationships, cycles where a relationship disallows them, impossible cardinalities, and schema-version regressions.
2. Model create, update, delete, resolve, lookup, import, export, and migration as named `ctx` flows with removable stages. The adapter contributes authorization, validation, persistence, and audit stages; consumers may contribute normalization and resolution stages.
3. Add a caller-neutral lookup-provider capability. Providers advertise the schemas, layers, fields, and languages they support and return suggestions with provenance and confidence. The create flow invokes available providers through `ctx`, never imports Jisho or another provider, and requires a user to accept external suggestions before persistence.
4. Keep automatic structural resolvers separate from optional lookup providers. Structural resolvers produce deterministic relationship proposals; lookup providers enrich fields and alternate definitions. Store resolver identity, version, confidence, and whether each proposal was accepted manually or automatically.

## Data model and enforcement

- Persist schema registrations and versions, generic entries keyed by schema and layer, typed field values, ordered relationship edges, aliases/alternate definitions, and provenance. Do not encode layer names in tables or service branches.
- Validate fields and edges against the entry's schema version in one transaction. Enforce minimum/maximum targets, uniqueness, order, target-layer compatibility, same-language or cross-language policy, scope visibility, and deletion rules at the service boundary and with database constraints where portable.
- Represent alternate definitions as normal entries connected by a schema-declared relationship, rather than special columns. This permits several definitions, ranked usage, locale-specific glosses, and sentence-level meanings without privileging a language structure.
- Resolve only inside the actor's readable scope and selected language/schema. Never silently create ambiguous components. Return ranked proposals and unresolved spans; permit automatic acceptance only for a schema's explicitly safe, deterministic resolver.
- Use Unicode grapheme segmentation as a baseline, not code-point splitting. Consumer resolvers may use longest-match tokenization and recursive composition. This supports English letters, Korean Jamo-to-syllable relationships, Japanese Kana/Kanji, and languages whose writing systems require multiple passes.
- Sentences are assembled from explicitly selected, ordered word-entry blocks. The stored edge order is authoritative; free-text sentence labels are presentation data and are not re-tokenized to infer identity.

## API and capability surface

Expose schema discovery, layer discovery, entry search, entry detail, relationship traversal in both directions, resolver previews, lookup suggestions, mutations, and schema migration through the Study gateway. Routes remain thin and obtain auth and Library operations from route context. List endpoints return all matches unless the caller explicitly supplies a validated limit.

Use opaque entry IDs in canonical deep links such as `/study/library/:schemaId/:layerId/:entryId`. Detail responses include fields, ordered outgoing relationships, visible incoming relationships, provenance, aliases, and unresolved requirements. Import/export documents carry schema ID and version and are rejected or migrated explicitly when incompatible.

## Complete UI

Build the adapter-owned page with `createPageComposer` and the app router. Generate navigation and editors entirely from schema metadata:

- schema/language and layer browsing with search, scope, and relationship filters;
- a deep-linked detail view for every entry, including fields, alternate definitions, provenance, outgoing components, incoming usage, and links to every related detail view;
- schema-driven create/edit forms with ordered relationship pickers, cardinality feedback, unresolved-span display, resolver previews, and accepted/rejected lookup suggestions;
- a block composer for sentences that stores selected word IDs and order;
- accessible loading, empty, error, conflict, and disabled-provider states, keyboard operation, and localized labels supplied by the registering consumer.

Opening a deep link directly and navigating to it client-side must produce the same view. Browser code calls the Study gateway UI client rather than constructing API requests in the page.

## Delivery sequence

1. **Contract tests first:** capture English, Korean, and Japanese example schemas; invalid graphs; cardinalities; scope boundaries; provider absence; and deterministic versus ambiguous resolution.
2. **Registry and generic types:** add neutral schema contracts, registration through `ctx`, immutable schema versions, and gateway discovery APIs behind a feature flag.
3. **Generic persistence:** introduce versioned schema/entry/edge/provenance storage and a resumable migration from fixed layers. Preserve old IDs and exports; do not remove the old read path yet.
4. **Flow orchestration:** implement transactional validation, lifecycle flows, structural resolver hooks, lookup-provider hooks, and audit records. Add concurrency and rollback tests.
5. **Resolution implementations:** ship a generic grapheme resolver plus fixture consumers demonstrating English, Korean composition, Japanese alternate characters, and explicit sentence blocks.
6. **API and client:** expose provider-agnostic endpoints through the gateway and centralize requests in its UI client. Add authorization, malformed-schema, deep-traversal, and no-default-limit tests.
7. **UI:** deliver browse, detail, create, edit, relationship traversal, sentence composition, lookup review, and direct deep-link handling with accessibility tests and visual screenshots.
8. **Migration and removal:** dual-read and compare legacy results, migrate existing records, switch consumers, then delete fixed constants and layer-specific branches only after compatibility, performance, and rollback checks pass.

## Acceptance gates

The redesign is ready when a new consumer can define an unfamiliar structure without adapter changes; invalid relationships cannot be persisted through any write path; English and Korean fixtures resolve correctly; sentence identity comes from ordered selected blocks; lookup providers can be added or disabled solely through `ctx`; every visible entry has a reload-safe detail URL; all supported languages localize the UI; and migration can roll back without losing IDs, edges, provenance, or scope controls.
