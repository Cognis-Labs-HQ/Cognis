# Library Adapter

## Consumer-defined schemas

The Library adapter stores generic, related study records. Consumers register immutable, versioned schemas through the `study:library` ctx capability. A schema defines its language, layers, typed fields, and directed relationships. Layer metadata supplies the localized user-facing name—such as “Kanji” instead of a generic “Compound Characters”—and the UI always prefers that name.

Relationship definitions declare their target layer, cardinality, ordering, and optional resolver. Every write validates fields, schema version, targets, scope visibility, and cardinality before persistence. Alternate definitions are modeled as consumer-declared layers and relationships.

Layers may target themselves in a relationship. Relationship concerns are explicit and independent: `variant: true` identifies an alternate form, while `child: true` alone opts the relationship into the spatial unfolding hierarchy. A variant is therefore never assumed to be a child. Use `child: true` only where the target is the actual conceptual parent of the source record; relationships that merely share an origin, shape, spelling, or transformation must remain ordinary deep links. Same-layer relationships render as compositions by default; only relationships marked as variants or explicitly assigned `alternateSpelling` use alternate-spelling presentation.

## Resolution and lookup

The `grapheme` resolver uses Unicode grapheme clusters and the `longest-match` resolver uses explicit whitespace-delimited blocks. Both return proposals and unresolved units without silently creating entries. Sentences and other ordered structures use stored relationship positions as their identity.

Consumers can contribute lookup providers with `registerLookupProvider`. Providers declare whether they support a schema and layer, then return ranked suggestions with provenance. Removing the returned registration callback disables that provider without coupling the adapter to its implementation.

Create, resolve, and lookup operations participate in named ctx flows so consumers can add removable normalization, proposal, validation, enrichment, or ranking hooks.

Minimal grids derive a bounded chart width and proportional card scale from `grid.rowSize`; explicit blank items remain dimensioned grid cells so chart columns never collapse.

## API and UI

Nested children remain available as a complete subtree: hovering or focusing any unfolded child reveals all of its direct children without collapsing sibling paths. The long-press hint appears only on hover as a floating element below its card. Hovered child cards keep a fully opaque raised surface so cards beneath them cannot show through.

Chart grids reserve an internal card-gap inset so card and focus borders remain fully visible. Spatial child placement measures the remaining capacity in every direction, reserves only coordinates used by the active ancestor path so descendants can reuse slots belonging to cursor-pruned alternate branches, and prefers a direction that can contain the descendant branch before falling back to the greatest visible capacity.

The Study gateway exposes schema discovery, generic entry listing and creation, entry details, bidirectional tracing, resolution previews, and lookup suggestions. Browser requests are centralized in the Study gateway Library client.

Content owners, administrators, and owners can select multiple visible entries and permanently delete them with their relationships. Deleted module content is restored through the module enable lifecycle when absent. The deletion confirmation can instead blacklist each selected content hash, preventing an identical record from being imported again. Multi-select actions use the page composer’s floating action bar after a right-click; a normal card click or the close action leaves selection mode. Relationship links switch to the referenced entry’s browseable layer and use the shared target highlighter. Definition references are applied directly to their displayed text, and only schema-declared resolver relationships produce constituent boxes, preventing duplicate or unrelated writing-system links. Dark audio controls explicitly neutralize native panel saturation.

The schema-driven page hides implementation-only definition and particle layers from direct browsing. Browseable layers use tabs, metadata filters, entry cards, metadata pills, and scope icons. Reusable popup details show definitions and meanings beneath the larger item heading. Recognized constituent entries, including sentence particles, appear as navigable sub-boxes inside that heading instead of a separate Components section, while particle details remain read-only. Resolver-backed references render only as navigable highlighted boxes; redundant relationship headings and composition operators are omitted. Constituent labels and pronunciations are represented through the popup title and secondary-title item contract; the detail body never repeats them through separate pronunciation or component containers. Usage examples are shown only on an entry directly referenced by an ordered record, never transitively through another related entry. Metadata filters appear as immediately applied pills and use schema detail groups when a module supplies them. Metadata filtering now evaluates only base cards that carry serialized filter values, preventing floating variant cards from passing an undefined value to JSON parsing. Character cards with variants now show a localized long-press hint on hover and reveal their child cards only after the hold threshold. The group remains open while focus stays within the parent or children and closes on focus loss. Variant relationships are not repeated in a second detail section. Expanded child cards use a green directional arrow and green border, with the same spacing from their parent that normal cards use between one another.

## Access

Global records are readable by authenticated users and writable by admins and owners. User records are private. Class access is delegated to the Classes capability. Relationship targets must be visible to the writer and must use the same schema version.

## Declarative content packs

Installed content packages call `inspectContentPack(root)` to validate or `ingestContentPack(root)` to install a data-only Library. Each root contains `manifest.json`, a referenced schema file, and a content directory whose immediate subdirectories match layer IDs. Files contain record arrays with stable IDs and explicit references. Cognis validates the complete graph, derives namespaced IDs, records a digest and receipt, and writes the schema, entries, and edges atomically. Entry IDs remain stable across pack versions, and ingestion reconciles identical content hashes from older imports into one canonical entry while preserving its relationships. A spatial hierarchy requires `child: true`; `variant: true` may additionally identify an alternate form but neither enables nor disables unfolding. Records marked `hidden: true` never receive a spatial placement, even when their relationship is a child. The browser assigns each declared child an available bounded grid slot and recursively unfolds declared child chains up to four levels deep. Records that must exist only as composition targets set `hidden: true`; they remain resolvable and deep-linked in details but never become chart cards. Child records reference their actual parent and remain independent Library entries. A layer may define a `grid` with a `rowSize` and an `items` sequence of content record IDs, numeric `displayId` values, or explicit `{ "blank": true }` placeholders (`null` remains supported); the browser preserves those chart positions and scales each card to the requested row width. For eligible content owners and administrators, selection checkboxes remain hidden until a card is right-clicked, then appear across the Library with dark-theme styling. The full authoring contract and example tree are documented in `study-language-framework.en.md`. Metadata filter groups may declare `required: true` so one tag always remains selected and `defaultTag` to select a module-chosen tag initially; a group that renders only one tag selects it automatically. Layers may set `minimal: true` to render only each entry’s primary label in a compact card while retaining normal click, long-press child, and selection interactions. Ordered records must be completely represented by their positioned references; imports reject labels containing unlinked text. Records may set `hidden: true` to remain referenceable and available in detail popups while being omitted from direct browsing together with all descendants.

## Localized definitions

Every layer with the `definition` semantic role declares its module-owned string-key prefix and its string-key and localized-text fields. Definitions are managed only while editing entries that require them; they are not directly browseable or editable as independent Library sections. English remains the required source text, generated keys remain on definition records, and the optional `localization:translateString` capability can fill omitted languages.

Non-character layers may set `displayDefinition: true`. Such a layer must declare a required relationship to a definition/meaning layer, and every imported entry must provide one of those references. Cards then prefer the localized definition rather than duplicating internal labels. A language module can contribute `displayDefinition` from any stage of `study:library:composeEntryDetail` to aggregate a sentence meaning or apply language-specific particle effects. Cognis only renders that result; grammar and sentence interpretation remain module-owned content.

Only fields declared by the active layer schema are eligible for generic detail rendering. Empty, hidden, badge, pronunciation, and audio fields are omitted, so unknown or internal payload keys cannot leak into a “Fields” section.

Definition records are never directly browseable, linked, or opened; they exist only to supply localized text to other entries. Visible definitions and metadata resolve exclusively in the active interface language and never fall back to the studied language, another browser language, or English. A language-neutral schema identifier is used when localized structural metadata is unavailable.

Resolver relationships may declare `presentationRole` as `composition`, `alternateSpelling`, or `pronunciation`. The detail UI labels and separates those groups instead of presenting every resolver result as an ambiguous “Reading Characters” sequence. A relationship to a lexical-unit record can therefore represent a complete reading such as a word, while a composition remains an ordered sequence of constituent writing units.

## Writing-unit pronunciation and audio

Layers with the `atomicWritingUnit` or `compoundWritingUnit` role declare required standard `pronunciation` (`stringList`) and `audio` (`audio`) fields. Content packs may supply MP3, Ogg, WAV, WebM, or M4A files, or an HTTPS URL. Local files remain authenticated pack assets. Remote audio is fetched through the entry-authorized Library route and restricted to public HTTPS hosts and supported audio media types. The Library registers a component-managed `study-library-audio` namespace with the Files gateway and stores each URL once under a deterministic key without an adapter-level size limit. Persistent storage, quotas, and physical file handling remain the Files gateway's responsibility, while every playback request still enforces the entry's scope. Character and alternative-character pronunciations appear beside the writing unit in cards and detail titles; word and sentence pronunciations remain below their text. A module may model a meaningful single-character word by giving a lexical-unit record one character reference. Character details then list those inbound word relationships without synthesizing content in the Library. Writing-unit pronunciation beside a popup title uses the popup’s escaped secondary-title contract, with smaller regular-weight text. Audio surfaces opt out of forced-color substitution and neutralize native control saturation in dark mode.

## Metadata filter groups

A badge field can set `detail.group` to place related filters together and `detail.exclusive` to control selection. When every field in a group declares `exclusive: true`, choosing a pill clears the group's previous choice. The default `false` permits multiple selected pills. Every field in a named group must use the same exclusivity setting.

## Authenticated audio playback

The Study gateway client fetches entry audio through the authenticated API client and gives the player a temporary object URL. The URL is revoked when the detail popup closes. Native player controls declare light and dark color schemes and follow the active application theme.

When a composition contains exactly one entry whose label matches the current entry, the duplicate composition block is suppressed and that deep link replaces the popup heading instead.

The page-composer widget now shrink-wraps the Library schema and remains capped to the available width, preventing unused widget width from creating horizontal overflow.

Deletion resolves the final relationship cascade and authorizes every affected entry within the same transaction. A relationship added concurrently therefore cannot expand a deletion beyond the actor's authorized content.
