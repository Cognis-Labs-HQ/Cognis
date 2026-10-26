# Library Adapter

## Extensible Browser Actions

The Library provider publishes `study:library:client` through its lifecycle-scoped ctx. Every gateway client operation runs `study:library:<clientFunction>` through `before`, `execute` and `after`. For example, extend `study:library:createLibraryEntry` at `before` to inspect or adjust `input.args` (the client function’s positional arguments), or throw to veto before the request. The `after` stage receives `data.result` and may adjust the returned value. Server authorization and validation still apply. Reads, dictionary resolution, imports, publishing requests and media mutations use the same boundary. Provider teardown aborts in-flight requests and removes capabilities, flows and hooks; stale handles reject. Re-enabling registers fresh actions.

Grouped relationship names are treated as data, including constructor, without inheriting object properties.

Library JSON mutations accept at most 5 MiB and reject larger streams with HTTP 413 before invoking a mutation. Card field JSON and its normalized searchable form each have a 50,000-byte UTF-8 budget, leaving space for labels and tags in the search projection. Audio attachments require an exact upload path; traversal and nested paths are rejected before storage access. Creating and editing cards share one canonical reference writer, preserving groups, positions and selected transformations. Failed location loading shows a localized toast; responses from cancelled mounts do not update current controls.

Packaged assets use study_library_asset_chunks, keyed by a SHA-256 identity of the publisher, pack, version and full asset path plus an integer position. The public asset URL and original bytes remain unchanged. A pack-key index scopes removal. Schemas retain their schema/version identity and use a base fragment plus study_library_schema_parts. Both payloads use Unicode-safe fragments of at most 60,000 UTF-8 bytes. Reads assemble fragments in order; ingestion replaces them in its existing transaction. Schema-version conflicts, sole-publisher replacement, rollback and shorter replacements retain their existing semantics.

Flat references keep their established key. Grouped placements use study_library_reference_groups with a deterministic reference_id including group and position. Schema initialization transactionally moves existing grouped rows before writes begin; failed transfers retain the old graph for retry. Reads, reverse references, deletion, editing and pruning use both active edge stores. Imported reference cleanup batches 500 source IDs while preserving provider edits. New-card notifications run only after the outer creation transaction commits.

External-module bootstrap has a bounded two-minute default budget, allowing validated content-pack ingestion to finish before capabilities are published. An explicit host timeout override still applies. Failures and deadline expiry remove scoped contributions and keep the module unavailable. Packaged audio reuses persisted versioned recordings on reactivation, recreating missing files through the Files gateway. Library record and relationship reconciliation still runs, including for unchanged packs.

Composer suggestions occupy a separate row, keeping input and Save Pronunciation controls stable. Selecting a dictionary result commits unresolved spelling to canonical character references, including hidden writing units such as small っ. Existing committed compositions remain intact; hidden units stay out of browsing.

Card composers confirm cancellation before discarding edits. Carousel selections append repeated card placements, and dragging reorders individual placements. Sentence pronunciation previews box each source component; redundant input feedback is omitted. Carousel hover previews show only the primary pronunciation and definition, positioned within the viewport.

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

Nested children remain available as a complete subtree: hovering or focusing any unfolded child reveals all of its direct children without collapsing sibling paths. The long-press hint occupies one clipped line in the reserved card footer on hover, keeping wrapped help text clear of the preview content. Hovered child cards keep a fully opaque raised surface so cards beneath them cannot show through.

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

Writing-unit schemas declare standard `pronunciation` (`stringList`) and `audio` (`audio`) fields. Providers choose whether pronunciation values are required; source characters with unknown readings can leave an optional pronunciation absent without inventing a reading. Required pronunciation fields still reject missing values. Content packs supply MP3, Ogg, WAV, WebM, or M4A files as authenticated pack assets. The Library stores these files in its component-managed `study-library-audio` namespace through the Files gateway. Persistent storage, quotas, and physical file handling remain the Files gateway's responsibility, while every playback request still enforces the entry's scope. Character and alternative-character pronunciations appear beside the writing unit in cards and detail titles; word and sentence pronunciations remain below their text. A module may model a meaningful single-character word by giving a lexical-unit record one character reference. Character details then list those inbound word relationships without synthesizing content in the Library. Writing-unit pronunciation beside a popup title uses the popup’s escaped secondary-title contract, with smaller regular-weight text. Audio surfaces opt out of forced-color substitution and neutralize native control saturation in dark mode.

## Metadata filter groups

A badge field is filterable by default, and providers may set `detail.filterable: true` on other primitive or localized metadata fields to expose their values as learner-facing filters. Filterable fields can set `detail.group` to place related filters together and `detail.exclusive` to control selection. When every field in a group declares `exclusive: true`, choosing a pill clears the group's previous choice. The default `false` permits multiple selected pills. Every field in a named group must use the same exclusivity setting.

## Authenticated audio playback

The Study gateway client fetches entry audio through the authenticated API client and gives the player a temporary object URL. The URL is revoked when the detail popup closes. Native player controls declare light and dark color schemes and follow the active application theme.

When a composition contains exactly one entry whose label matches the current entry, the duplicate composition block is suppressed and that deep link replaces the popup heading instead.

The page-composer widget now shrink-wraps the Library schema and remains capped to the available width, preventing unused widget width from creating horizontal overflow.

Deletion resolves the final relationship cascade and authorizes every affected entry within the same transaction. A relationship added concurrently therefore cannot expand a deletion beyond the actor's authorized content.

For lexical units and ordered lexical sequences, relationships presented as `alternateSpelling` appear as navigable secondary spellings directly beneath the primary detail heading. Structural or variant children are not repeated as an alternate-spellings section in detail content.

A pronunciation identical to the primary or a secondary spelling is displayed only once. Pronunciation text remains plain title metadata rather than being heuristically converted into links to similarly labelled writing-unit records; relationship links continue to come exclusively from declared Library references.

## Content-pack upgrades

Pack upgrades prune records omitted by the publisher because an installed provider is authoritative for its namespace. A manifest may explicitly set `pruneOmittedRecords` to `false` only when it intentionally publishes a partial record set.

## Administration and learner pages

`/study/library` is an administrator-only data editor. Its side menu groups every record for the selected language by schema and layer, including definition and relationship records. Selecting a layer immediately moves the active menu state and shows a clean row list. Clicking a row opens a read-only variant of the schema-driven edit popup; right-clicking enters multi-select mode, while the small theme-aware pencil opens the editable variant.

Learner layers appear in the Explore side menu at `/study/explore/<ISO language>/<navigationSlug>`. Modules declare the optional unique `navigationSlug` on each layer; its layer ID is used when omitted. Library and Requests keep their existing routes. Only sentence previews truncate long titles and definitions; other layers retain their rendering.

## Focused cards and editing

Learner card previews stay deliberately concise: the primary label and pronunciation share one line, with only the scope indicator alongside them. Definitions, metadata, relationships, and other supporting content remain in the detail popup, where deep links continue to work without duplicate sections.

The administrator edit popup derives controls from each layer's field and relationship schemas instead of exposing raw JSON. Localized text, lists, booleans, numbers, strings, and relationship targets receive suitable controls, and popup close protection tracks dirty fields before allowing dismissal.

## Provider-owned editor contracts

Every editable field must declare an `input.control`; its localized label and choice labels come exclusively from provider metadata. Providers choose free text, tag lists, single- or multi-select controls, checkboxes, numbers, localized text, or an audio-file browser, and may mark classification fields immutable after creation. An `audioFile` control declares its Files-gateway namespace and optional language-relative prefix so selection and upload never escape that language's audio area. A field may declare `input.linkRelationships` to make its reading or pronunciation values navigable through multiple provider-authored relationships. The host merges matching references by authored position and resolves each displayed segment against the target card label or pronunciation aliases while keeping that original card as the link target.

Composition references must always target the closest available structural unit. For example, 日本語 references the lexical unit 日本 and the compound unit 語 when 日本 exists; 日本 then references 日 and 本. The resolver prefers the longest higher-level match and only descends to smaller writing units when no closer record exists.

Related-entry buttons no longer repeat their label in a hover overlay. Vocabulary links include their provider-supplied pronunciation, so a valid single-character lexical unit such as `人 ひと` remains distinguishable from the writing-unit record `人` without suppressing meaningful one-character words. Variant hints reserve their own compact lower corner inside the card instead of covering its primary content. Dark-theme card surfaces blend toward the application background rather than white.

Expanded variant branches remain clipped to the base grid. Cognis first honors each provider-preferred direction, then evaluates alternate directions against the rendered grid boundary and selects the first fitting option, restoring provider preferences when the branch closes. The long-press hint is static to preserve crisp text and uses a 25% larger label.

A displayed card keeps its assigned position while descendants are fitted independently. When path pruning leaves fewer directions than siblings, additional children stack outward in the same row or column rather than overlapping or displacing their parent.

While a child-card branch is open, unrelated parent cards retain their normal surface instead of reacting to hover, and their scope/visibility icons join the blurred background. The active parent and its visible descendant path remain crisp and interactive.

Lexical-unit detail popups keep the vocabulary label solely in the popup title. Their title detail contains only the definition localized for the active Cognis language, avoiding duplicate spellings or pronunciations beside the heading.

When a related-entry link opens a lexical unit without its own definition, the popup inherits the localized definition displayed by the source card. A definition supplied by the vocabulary record always wins, allowing several vocabulary records linked to one writing unit to retain distinct niche meanings. Previous/next controls and title-composition links do not carry this fallback context.

Cards may reference multiple definition records in provider order. The first localized definition is prominent in the title detail unless it duplicates the card title; later definitions appear in an Additional Definitions section, which is omitted when empty. Context inherited from a navigation source remains a fallback only when the destination vocabulary supplies no definitions.

Runtime fitting reserves the root card and every child card already placed in the visible branch. A child keeps its provider-preferred direction when that bounded slot is free; otherwise Cognis chooses the bounded candidate with the least card overlap. This prevents siblings from collapsing into one slot while retaining outward row or column stacking when nearby positions are exhausted.

For ordered lexical sequences, only relationships whose `presentationRole` is `composition` (the default presentation role) contribute to label reconstruction. Pronunciation and alternate-spelling links may target lexical layers and reuse positions without being mistaken for sentence constituents.

Detail views omit the `composite` class. Other content classes are reduced to their human-facing final segment and rendered as pills (for example, `lexical:noun` becomes **Noun**). Composite headings place alternate readings and pronunciation beneath the primary reading while retaining the definition in the adjacent column. Reverse vocabulary navigation suppresses same-label lexical entries so a correct word-to-writing-unit spelling edge does not appear to recurse back into itself. A linked title-detail spelling is also omitted when both its normalized text and target match a link already composing the primary title. Relationships without a resolver or presentation role are dependency-only edges: they remain available to reverse navigation and deletion policies without being inferred as title composition. Detail views combine vocabulary usage and other inbound dependencies into one **Used By** section, preferring the vocabulary target when multiple records have the same normalized label. Composite popup headings use a compact row gap between the primary title and its reading detail, while card previews keep remaining title and definition text centered after deduplication.

## New-content tracking

The Library stores viewed entry UUIDs per account. Provider updates preserve this state and notify enabled accounts only for newly introduced stable entry IDs, not for the pack's complete updated contents. Global entries introduced by provider pack ingestion or approved user and administrator contributions trigger a Study Library notification for enabled accounts. Entries absent from an account's viewed cache display a **New** pill in previews. Hovering a card or opening its details or editor, including through direct links and relationships, records it as viewed for that account. A successful write immediately removes matching preview markers and preserves the state across reloads.

## Contributions, visibility requests, and search

Users can create cards in their personal namespace, teachers can also create in classes they own, and administrators can additionally create global cards. Language providers shape layer-specific form fields through `study:library:registerConstructor`; visibility, class selection, and definition-preview controls remain adapter-owned. Before personal or classroom creation, the Library reports an identical visible global entry and requires explicit confirmation. The creator defaults to personal scope; eligible administrators can opt into global publication, while teachers can opt into only those writable classes whose language matches the active schema.

Personal cards can be published to an enrolled class for its teacher to review or to the global collection for an administrator to review. A pending request can be withdrawn by its submitter or an authorized administrator. Approval moves the original card rather than copying it. The submitting user retains attribution and may request edits to global content; administrators who modify the staged card become joint owners. Scope changes and deletions remain subject to the destination permissions. Provider manifests may set `protected: true`; protected entries cannot be moved or deleted. Imported and user-created records persist normalized search text, and the Library side menu searches every layer while hiding empty results.

## Language-owned card constructors

A language pack can place a `cardConstructor` on each creatable layer in its schema. The specification supplies the localized primary-label prompt, ordered field and relationship IDs, provider defaults, and whether Cognis should expose the hidden-card or preview-definition switches. Cognis adds role-authorized visibility and class controls around that specification; a layer without a constructor is deliberately read-only for creation.

Creation presents every relationship collection without scrollbars or directional controls. Hover previews use the current UI language definition. Selected or suggested items become draggable composition blocks, their stable IDs generate relationship references, and pronunciation is derived recursively from referenced writing units. Definition creation requests all supported UI-language translations.

A runtime language module may instead resolve the public `study:library:provider` ctx capability, call `ingestContentPack(moduleRoot)`, and call `registerConstructor(...)`. Constructor IDs are validated against the registered schema before the form is exposed. The returned remover lets module disablement cleanly unregister a runtime constructor.

## External package contract

`study:library` is the authoritative boundary for executable providers and data-only content packs. A pack owns exactly the namespace named by both its manifest and schema. Schema, layer, field, relationship, constructor, and option labels are localized maps. Provider metadata may add JSON-compatible values; Cognis validates every value, stores the complete schema, and returns it unchanged from `listSchemas()` and `GET /api/v1/study/library/schemas`. Unknown field types are accepted only with a declarative `validation` rule, so extensions cannot bypass content validation. Built-in types cover strings, finite numbers, safe integers, booleans, string lists, localized text, and singular or list asset/audio references. Pack protection, semantic roles, grids, detail hints, activity compatibility, definition localization, interest veins, licenses, and assets are part of this versioned contract. The synthetic external-pack fixture under `tests/fixtures/` is the compatibility reference for provider CI; external providers should inspect their production pack with the installed `study:library` capability before release.

Direct executable schema registrations remain immutable by schema version. A newer release of an authoritative content pack may, however, revise the stored schema document at the same compatibility version when every installed owner of that schema version has the same publisher and pack ID. Cognis rejects collisions with independently registered or differently owned schemas, updates the schema and entries in one transaction, and refreshes the in-memory schema after the transaction succeeds.

Content records may declare a namespaced `class` value such as `lexical:noun` or `lexical:verb`. The Library validates and preserves this provider-neutral classification for future class-aware rendering and activities. List-valued local audio references are cached individually, list-valued assets are rewritten to authenticated URLs, and installation receipts preserve manifest metadata.

## Publishing requests

Library publishing requests live on the dedicated **Requests** Study sub-navigation page. Enabled administrators receive Study notifications about incoming requests and other administrators’ decisions.

## Administration and creation

The administrator Library shows only layers for the already selected Study language and uses a non-collapsible layer menu. Editors place the label and content class first, distinguish View from Edit mode, protect unsaved edits, and provide Save only while editing. Definition records are always hidden, carry the `definition` class, and do not expose preview or visibility switches; ordered sequences carry the `composite` class. A content record may set `editable: false`, and particle layers are never editable. Creation is available only as a `+` page action on user-facing layer pages and guides the user through visibility, content, and relationships. Submitters can inspect and withdraw their own publishing requests on the Requests page.

Creation keeps resolved cards inside the Input control and derives pronunciation from both selected records and unresolved atomic characters in real time. Duplicate carousel labels collapse to the best localized definition preview. Relationships are displayed as a read-only parent/card/child map, while the Definitions tab can create and link multiple complete translation sets in nested dialogs. Personal and classroom authors never receive the administrative Hidden control; global publishing is labelled Publish and explains its review request in an information tooltip.

Direct creation excludes definition layers; definitions exist only when created and linked from another card composer. Composer dialogs use shared unsaved-change protection after type selection. Detail audio uses a compact speaker control: a card plays its own audio or, for a composite, each ordered component audio in sequence, and remains disabled when any component lacks audio. The `strokePattern` field stores ordered normalized coordinates, monotonic timing, optional pressure, and an acceptance tolerance for deterministic drawing practice.

Card construction limits each relationship carousel to two vertically scrolling rows and uses the shared anchored-popup controller for stable, viewport-aware previews. Definition relationships never render a carousel; their dedicated localized-set dialog creates and links the record privately. Input resolution compares the complete normalized value for exact matches and relationship diagrams show only explicitly selected composition records. Publish controls remain on one line, create actions use a borderless centered plus, drawing/edit header actions expose hover labels, and speaker assets include explicit light and dark variants.

Relationship carousels retain two rows but now scroll horizontally. Stroke-pattern payloads are reserved implementation data and never appear in card details. Drawing and audio actions use paired light/dark assets, and entering drawing practice closes the detail dialog.

Study Library pages use document scrolling so the page never competes with an inner content scrollbar. Cards use a consistent preview height. Composer relationship add controls open a type-locked nested composer whose heading identifies that card type; nested dialogs stack above their parent. Carousel previews render only through a content-sized body portal and are removed immediately when their item loses hover or focus.

The floating create action uses a two-rem black or white plus according to the active theme. Composer carousel headings come from the provider’s target-layer metadata and their items remain restricted to that target layer. Audio speaker icons switch from explicit light and dark assets according to the application theme rather than the operating-system color preference.

Library cards accept searchable tags such as proficiency levels. Runtime providers can register the existing lookup-provider contract through `study:library:provider`; lookup results may supply validated fields, including a `strokePattern`, with provenance and confidence.

## Composer lookup providers

A runtime content provider registers a lookup implementation through `study:library:provider.registerLookupProvider`. It supplies a stable ID, localized service labels, a schema/layer support predicate, and an asynchronous lookup that receives the raw composer label. Cognis lists each compatible provider as **Lookup with: service name** below the input. The selected provider may return a canonical label, validated field values, ordered relationship references, provenance, and confidence; the composer applies the highest-confidence result while keeping endpoint ownership in the Study gateway client.

Module enablement validates required server capabilities against both the injected route context and public capabilities contributed to the system ctx. Therefore, a module may safely declare `study:library:provider` in `requiresCapabilities`; private ctx capabilities remain unavailable.

Creation and editing preserve unordered relationships without emitting position metadata. Relationship structure is visible only in View mode; edit and create forms retain those references through hidden controls. Compound-writing-unit forms present a free **Input** field, label their atomic-reference carousel from the provider’s pronunciation field, and expose lookup actions inline only after input is entered. Stroke patterns remain hidden provider data. Definition add actions use a larger neutral control, and carousel previews size their surface to their complete contents.

Existing compound-writing-unit cards place their pronunciation selector inside the Pronunciation field instead of above the Content tabs or beside a tag-entry control. Carousel headings use the content provider’s localized target-layer names. The editor orders selected atomic writing units by their occurrence in the card pronunciation or label, then derives the stored pronunciation from that sequence. Existing audio fields show the stored filename, newly uploaded files retain a recognizable filename, and speaker assets follow the active application theme.

## Provider-linked pronunciation editing

A provider can set `input.linkRelationships` on a pronunciation field. The editor then replaces free-form tag entry with ordered carousels for exactly those relationships, using each target layer's localized provider label. Saving a provider-installed card marks that record as user-modified, so later content-pack reconciliation preserves the user's fields and relationships.

Pronunciation editing is a repeatable two-step process: select provider-compatible component cards, then commit the derived reading. Carousel items show their pronunciation rather than their primary label. Compound writing units draw from atomic writing units, while ordered lexical sequences draw from lexical units such as vocabulary and particles. Audio uploads use a stable card-and-field object key, so replacing an upload overwrites the previous object.

While Drawing Practice is open, selecting another card with a stroke pattern loads that card into the existing pad instead of opening its detail dialog.

Vocabulary, sentences, and composite cards derive drawing guidance recursively from their ordered writing-unit references and cannot declare their own stroke patterns. Provider-owned alternate characters reuse related character audio when possible; a user-owned card's explicitly uploaded audio remains authoritative.

Creation forms use the shared form builder for required labels and localized definition fields. Alternate-character input is free text but becomes valid only after a dictionary provider confirms it; provider results persist hidden required fields such as stroke patterns. Pronunciation selectors are embedded in the Pronunciation field, words may compose pronunciations from character cards, and particle is no longer an author-selectable content class. Composite drawing resolution follows the primary written label before pronunciation links.

Editing validates existing records against the provider's current schema and migrates their stored schema version, so audio retrieval and updates remain valid after a provider upgrade. Detail traces retain edit permissions after the editor closes. Drawing is limited to writing units and vocabulary, and vocabulary stroke resolution uses the primary written label rather than pronunciation links.

Creation excludes particle layers. Vocabulary input uses provider-declared character, alternate-character, and vocabulary carousels. Sentence and composite input uses provider-declared particle, alternate-character, and vocabulary carousels. These layers derive pronunciation recursively from their ordered input and do not render a separate pronunciation editor. Alternate-character input remains unrestricted, while its provider-declared character carousel appears inside Pronunciation.
Alternate-character pronunciation composition accepts atomic character cards from the provider-declared pronunciation carousel. Vocabulary, sentence, and composite constructors omit the pronunciation field because their saved pronunciation is recalculated from the complete ordered relationship graph.

Every `cardConstructor` payload exposes `input_carousels` and `pronunciation_carousels`. Each array contains target layer IDs from that constructor: input carousels compose the primary value, while pronunciation carousels satisfy every declared reading relationship targeting that layer. For alternate characters, only pronunciation-carousel minimums are required; unresolved primary references do not block creation. Lookup providers may omit provider-owned provenance and ranking metadata because the Library normalizes those values from the registered provider.

Card-constructor carousel arrays are mandatory; missing arrays are rejected rather than inferred. Runtime form contributions are applied during server-side relationship validation as well as schema presentation. Edit forms use the same declared pronunciation carousel as creation forms. Audio uploads use the normalized card label and field ID as their storage filename, so uploading a replacement overwrites the same object.

Card constructors are the single form contract for both creation and editing. Their `fields` list determines visible scalar fields, while `relationships`, `input_carousels`, and `pronunciation_carousels` determine the available relationship carousels. Alternate-character constructors can keep Input unrestricted and place character relationships in Pronunciation. Vocabulary constructors can place character, alternate-character, and vocabulary relationships in Input; sentence and composite constructors can place particle, alternate-character, and vocabulary relationships there. Vocabulary, sentence, and composite pronunciation is derived recursively from their ordered parts, so their constructors omit the pronunciation field.

Whenever a pronunciation field is visible in a create or edit form, Library renders the pronunciation composer rather than a generic list textarea. The constructor’s `pronunciation_carousels` continue to determine which layer-specific relationship carousels appear inside it.

Vocabulary, sentence, and composite forms never render the generic list-value editor for pronunciation, even if a provider payload includes that derived field. Other list-valued provider fields use a plain newline-separated text area rather than removable tag chips; entry classification tags retain their dedicated metadata control.

Vocabulary and sentence cards play their ordered dependencies’ audio as one sequence when they have no uploaded audio of their own. An optional audio upload on the card overrides that derived sequence. If any dependency is missing audio, the disabled speaker explains the missing dependency on hover.

Pronunciation carousels now load every relationship implied by the constructor’s carousel layer declarations, even when a runtime form contribution omits that relationship from its scalar relationship list. Selecting carousel items updates the pronunciation value immediately; the redundant free-text pronunciation input and commit button have been removed from both create and edit forms.

Compound writing units compose pronunciations from atomic writing units. Lexical units use atomic writing units for pronunciation and writing or lexical units for input. Ordered lexical sequences derive pronunciations from their selected lexical units and particles. These semantic roles define the current composer contract.

The built-in semantic composer profile now applies the requested carousel contract directly: alternate characters use unrestricted Input and an atomic-character Pronunciation carousel; vocabulary uses atomic-character, alternate-character, and vocabulary Input carousels plus an atomic-character Pronunciation carousel; sentences use particle, alternate-character, and vocabulary Input carousels and expose no editable pronunciation. Vocabulary pronunciation is pre-populated recursively from character-layer values, while sentence pronunciation remains fully derived.

Atomic character and particle layers are immutable catalog data. The Library API now rejects create, update, update-request, and delete operations for those layers for every role, including administrators and owners. UI capability responses suppress edit and delete controls while retaining read-only browsing.

Ordered selections now share one composition-wide position sequence across every Input carousel. Position badges therefore describe the saved card order rather than restarting at one for each relationship carousel.

Authoring forms no longer expose Cognis' internal content-class selector. The provider's localized layer name identifies the card in detail views, and ordered-sequence records use the provider layer ID instead of semantic `sentence` or `composite` labels. Derived pronunciation is serialized according to the provider's declared field contract, including list-valued pronunciation fields.

Derived-field serialization resolves its contract from the provider schema rather than the constructor-filtered editor layer. Required pronunciation fields therefore remain discoverable even when the composer intentionally omits their direct input control.

Whenever a constructor declares Input or Pronunciation carousel layers, the corresponding heading includes a persistent selected-card field above those carousels. The field is initialized for existing entries, updates immediately with carousel selection, preserves composition order, and lets authors remove a selected card directly.

Carousel-backed fields accept the provider-owned field-level `multi_value` boolean. Multi-value fields add an explicit **Save {field}** action, keep committed values as removable pills above the active composition, and allow a committed value to be reopened for replacement. Every carousel composition field accepts only text resolved to cards offered by its configured carousels; unresolved text makes the form invalid. Removing a selected card or committed value requires the dedicated × control and confirmation. Existing-card editors mount the same relationship carousels as creation forms.

The field-level `multi_value` boolean is the sole multi-value declaration. Committed pills no longer repopulate the staging composition when clicked. Multi-value staging starts empty, its compact × controls remove only staged cards without confirmation, and references are committed only by the visible field-specific Save action. Saved values remain unchanged when their staged cards are removed. Card labels are generated from the ordered primary Input composition rather than exposed as a separate editable value, and successful edits immediately refresh the visible card preview.

Carousel cards once again show a hover and keyboard-focus preview for every item, including entries without a definition. Carousel previews and missing-audio tooltips are rendered in body-level anchored portals so card, carousel, and popup overflow cannot clip them.

Grouped relationships preserve nested reference arrays for multi-value fields. Each pronunciation can therefore own an independent ordered character sequence, which remains grouped through content-pack inspection, validation, persistence, API editing, and linked title presentation instead of being flattened into one ambiguous list.

Hidden cards are excluded from every carousel and type-ahead candidate list. Existing hidden dependencies remain preserved in the underlying relationship controls when editing a card, but they are never offered as author-selectable carousel choices.

Grouped relationships loaded from storage are compacted before their entries are position-sorted. A missing group index therefore cannot make the Library entries endpoint fail, while the order of every stored pronunciation group remains deterministic.

Library card previews show at most the first two distinct pronunciations. The entry detail view continues to expose the complete pronunciation set without making browsing cards excessively tall or dense.

Pronunciation display normalizes each nested character sequence into its complete reading before comparing it with the card label. A grouped pronunciation such as `["さ", "き"]` therefore renders as `さき` and is omitted when the card already uses that same value.

Linked pronunciation titles are also de-duplicated from what the UI actually renders: the linked character labels are joined, whitespace and Unicode forms are normalized, and the resulting reading is compared with the card value. This prevents a linked `さ` + `き` sequence from repeating a `さき` title even when its stored pronunciation representation differs.

A single multi-value field group may span several declared link relationships. Group indexes align across those relationships, so validation compares the field value count with the greatest linked relationship group count rather than adding the counts together. This supports pronunciations composed jointly from meaningful reading segments and direct character suffixes.

When a linked pronunciation spells the card's primary value exactly, title details descend one presentation level and show the linked cards' own pronunciation values. A Kana spelling such as `さ` + `き` can therefore present its character-layer readings instead of redundantly repeating `さき`.

Title reference de-duplication now treats an ordered spelling as one unit instead of removing individual matching characters. When that complete spelling matches the primary value, its linked character cards display their pronunciation values; partial fragments can no longer produce a title whose visible pronunciation disagrees with its primary value. Kanji detail views continue to show the provider's complete authored reading list rather than readings inferred from neighboring cards.

Removing a staged composer card requires clicking its compact × button exactly; the surrounding selected-card pill and empty composition area do not activate deletion. Before a creation popup closes, the composer also verifies every provider-required relationship minimum. Missing definitions now produce the standard validation toast and leave the popup, selected cards, typed input, and nested definitions intact for correction.

Long pronunciation and definition details in entry headings keep their original starting position but use at most 40% of the heading width and wrap onto additional rows. An em dash now separates definitions from pronunciations. Creation composers accept no more than 8 tags, 10 definitions, and 16 pronunciations, showing a localized toast when an author reaches a limit.

Dense pronunciation headings now use a four-column arrangement only when readings are present: the speaker sits beneath the scope icon, the pronunciation cluster retains up to 40% of the heading, and definitions wrap independently to its right. The 8-tag, 10-definition, and 16-pronunciation limits now apply equally to create and edit composers.

When an expanded character-child branch would cross the visible Library grid, runtime fitting now evaluates every diagonal slot before falling back to the opposite cardinal directions. It also treats all visible root cards as occupied, selecting the first in-bounds, collision-free diagonal and keeping both the child card and its connector on the canvas.

Fallback title composition follows the library hierarchy: sentences may link to words, words may link to compound and atomic writing units, and compound writing units may link to atomic writing units. A homographic vocabulary entry is therefore never treated as the spelling component of another vocabulary entry; entries such as the Japanese flower and nose readings `はな` both link independently to `は` and `な`.

## Sentence composition and transformations

Every `tag_carousels` item must declare `excludeFromBrowse`: `false` keeps its visible vocabulary in ordinary browsing; `true` reserves it for the composer. This is an explicit provider decision, independent of hidden pronunciation helpers. Existing metadata filter selection behavior is preserved.

`literal_carousels` supplies a one-line, read-only set of repeatable punctuation literals; providers should list the punctuation used by their language, such as `, . ? !` for English or `？！。、` for Japanese.

Providers tag base-form verbs and adverbs with `verb` or `adverb` and declare a layer `views` item using `layout: transformTree`. Named views filter entries only when explicitly selected; their tags do not remove lexical words from ordinary browsing. Content packs must ship only the base lexical entry (for example `歩く`), never one card per inflection. A schema-level `transformSets` declaration supplies deterministic state transitions. Every rule identifies its source and target state and performs one suffix replacement with `removeSuffix` plus `append`; multiple rules can leave a state, and later rules can continue from generated states. `matchTags` selects the applicable base-form class, allowing providers to distinguish conjugation families with tags such as `godan-ku`.

```json
{
    "transformSets": [
        {
            "id": "godan-ku",
            "matchTags": ["verb", "godan-ku"],
            "baseState": "base",
            "rules": [
                {
                    "id": "potential",
                    "fromState": "base",
                    "toState": "potential",
                    "removeSuffix": "く",
                    "append": "ける"
                },
                {
                    "id": "negative",
                    "fromState": "base",
                    "toState": "negative",
                    "removeSuffix": "く",
                    "append": "かない"
                },
                {
                    "id": "desiderative",
                    "fromState": "base",
                    "toState": "desiderative",
                    "removeSuffix": "く",
                    "append": "きたい"
                }
            ]
        }
    ]
}
```

Sentence transition tags select a dedicated composer carousel and are excluded from the ordinary input carousel. Their ordinary browse visibility follows the provider’s explicit `excludeFromBrowse` setting. Edit composers reconstruct repeatable punctuation tokens from the stored sentence label and ordered references. Transformation trees now expose actionable nodes: selecting a generated form updates the pathway preview, while the base card remains the canonical stored entry. Contract validation rejects duplicate punctuation literals, empty transform sets, duplicate state transitions, and no-op rules.

Child-card branches now retain every fitted card position while deeper descendants open. Newly revealed descendants are measured in depth order and redirected only into visible, collision-free canvas slots, preventing ancestor jumps, card overlap, and connector crowding during natural tree navigation.

Diagonal child-card paths now provide a larger continuous pointer corridor, branch changes wait for brief hover intent, and active cards use a steady focus ring rather than a pulsing animation. Direction fallbacks stay near the preferred axis before considering distant slots, producing denser and more consistent initial layouts.

Input and pronunciation composition now share the reusable token-input renderer and the same relationship-carousel implementation. Input carousels render immediately below their token field, use the same compact remove control and selected state, and expose dependency creation only when the target layer supports user-created cards. Newly created dependencies are inserted through the canonical reusable carousel item renderer in both create and edit composers.

New dependencies created from a relationship carousel are inserted through that carousel's normal selection path, so the returned card is immediately selected and added to the active composition stage. Alternate-character pronunciation composers also treat every atomic-character relationship as a pronunciation source, even when a provider uses a broader relationship presentation role.

Stroke-capable card composers display a dedicated **Stroke Pattern** section. Lookup providers declare the field IDs they populate; providers that advertise the stroke field are rendered there as a concise **Lookup** action, and loaded normalized stroke data is drawn in a compact four-rem square preview. Multi-tab editor validation marks every tab containing invalid required data, opens the tab containing the earliest invalid field, and moves focus to that field or to the definition creation action when a required definition is missing.

Popup title definitions now render without a leading em dash. Pronunciation and definition groups occupy the title row and align vertically with the primary card title.

Layer schemas can set `dictionary_lookup: false` to suppress lookup providers that declare the `dictionary` capability. Lookup providers declare their neutral capabilities and populated field IDs so stroke lookup actions are placed only in the Stroke Pattern section. Alternate-character composers treat non-definition relationships as pronunciation sources and do not require definitions. Tags render last in every Content form. Required tabs retain their normal styling and show only a red asterisk; a missing required definition also marks its add action.

The Library editor delegates tab activation, invalid-tab markers, and earliest-invalid-field focus to the reusable form composer’s `bindTabbedFormValidation` controller. Library code supplies only its domain-specific definition focus target and required-marker class.

Alternate-character form payloads copy `pronunciation_carousels` directly from the same schema’s vocabulary form payload. The composer consumes that aligned payload without alternate-character-specific carousel inference or relationship filtering. Stroke lookup routing continues to place the provider’s **Lookup** action inside Stroke Pattern. Library layer routes accept the optional view segment used by provider-declared Verbs and Adverbs views.

Alternate-character form payload alignment now updates both `pronunciation_carousels` and the relationship IDs that render those carousels. Relationships belonging to the replaced Vocabulary pronunciation carousel are removed, and the character relationships used by the Vocabulary card’s pronunciation carousel are inserted. The alt-character form therefore renders the character carousel and no longer renders Vocabulary beneath Pronunciation.

Pronunciation derivation now stops at the first explicit pronunciation and only falls back to a label for atomic character cards, preventing newly created words and sentences from being flattened into character readings. Creation rejects visible duplicates by normalized input alone; the confirmation explains that continuing selects the existing card rather than creating another row. Push-request persistence and review recognize both `update` and `merge` request kinds.

Popup definitions now occupy the second grid row beginning directly beneath the card title instead of a dedicated right-hand column. Readings remain centered in the title row, while long definitions wrap naturally under the title.

Particle pronunciation resolution is terminal, like atomic characters: an explicit particle pronunciation is used first, and otherwise the particle label is used. The resolver no longer descends through a particle’s character references, so context-sensitive particles such as は and が remain pronounced as authored.

Saving an empty pronunciation stage now shows an error toast. Saved pronunciation cards keep their remove control inside the card; selecting a saved card moves its grouped component references back into the stage and reselects the corresponding carousel cards for editing.

The “Always show definition(s) in card preview” control now lives in the Definitions tab beside definition summaries. Existing-card editors also expose the add-definition action; a newly created definition is selected immediately and added to the visible definition summary.

Parent attribution in card popup headings now shares the reading placement and is inserted before the definition placement. Cards that inherit a parent definition therefore keep the attribution together on the title row while the definition remains intact beneath the title.

Content-pack entry tags are now validated, included in content identity, and persisted in the Library entry tag column and search text. Provider-tagged vocabulary therefore remains available to declared views such as Verbs and Adverbs after ingestion.

Transformation sets support arbitrarily chained and branching rules, including optional pronunciation suffix operations and localized definition overrides. Verb and adverb views render these paths as connected technology trees. Selecting a transformable carousel card opens the same tree and inserts the chosen form into a composed sentence while retaining the reference to its canonical base card. Reopening a transformed reference detects its authored form, opens the base card under that form, and displays the complete path with transformation-specific pronunciation and definition details.

Child-card fitting treats every ancestor card as a hard exclusion zone. It evaluates diagonal and cardinal directions at progressively greater distances, so a blocked child moves two or more slots outward when necessary instead of crossing or disappearing behind any card in its parent chain.

Transform-tree views now begin as a dense, full-width card grid. Cards without available transformations remain inert. Opening an expandable card moves it to the top, animates the remaining cards away, and grows the tree directly beneath the centered root across the full content width; its close control restores the grid. Selecting a transformation highlights and continuously animates its complete route back to the root, while transformation labels stack above values to avoid narrow-card overflow.

Transformation trees now keep the source verb or adverb card as the unchanged visual root and omit the redundant selected-form summary beneath it. Connector segments meet without gaps and animate continuously throughout the tree, while the selected ancestry remains visibly emphasized. Clicking the already-open source card now opens its standard detail view.

Verb and adverb entries remain on the Vocabulary page, where provider-declared transformation tags appear as filters. Each transform rule can declare a localized `definitionTransform` with optional `matchPrefix` and `matchSuffix` boundaries and a required `template`. Templates compose along the selected transformation path and support `{{ definition }}`, `{{ stem }}`, `{{ prefix }}`, and `{{ suffix }}`, allowing providers to express grammatical changes instead of inserting a fixed marker. Form names appear in per-node information tooltips. The detail popup exposes a Variants action; selecting a node redraws the entry with its transformed title, pronunciation, definitions, and drawing input while suppressing editing.

Transformation graphs place every depth on one horizontal row, keep definitions below cards, provide fourteen-rem definition columns, and constrain both horizontal and vertical overflow to the graph viewport. Popup controls therefore remain visible while deep or highly branched conjugation families retain readable cards and definitions.

Definition transforms may also declare ordered localized `replacements`. The first matching substitution rewrites an earlier transformation before any fallback template is used, enabling context-sensitive chains such as `to (want to) exist` → `to (have wanted to) exist`; templates using `{{ definition }}` can instead append semantics, such as `to (want to) exist (and then)`. The untransformed entry is rendered as the centered root card above the first transformation row.

A sentence reference may declare `transformation: { "setId": "...", "path": ["rule-id", "..."] }`. Cognis validates that the path applies to the referenced base entry, persists it with the relationship, and resolves the exact generated form without relying on label heuristics. A transformed detail uses the standard child marker to show **From: {parent}**; selecting that parent annotation opens the canonical verb or adverb.

Inline card creation now commits staged pronunciation character selections before saving. Saving a reading already supplied by a lookup attaches its selected character links without adding a duplicate pronunciation. Lookup values immediately redraw using the pronunciation list’s newline format, and automatically composed vocabulary and sentence readings remain visible as the main input changes. Detail headings resolve reading groups by their complete reading rather than their field-list position, and can resolve unlinked readings to canonical writing-unit cards.

Transformed vocabulary headings and readings link to the canonical writing units of the displayed form. Used By also includes complete canonical spelling and pronunciation compositions, so compound kana links resolve upward even when stored references identify smaller units. Direct relationships remain visible; incomplete compositions do not create partial links.

Detail relationship lists show immediate neighbors. Used By, Usage Examples, and the relationship tree exclude dependants reached only through another spelling or pronunciation parent, including grouped references. Direct links remain available, and cyclic references do not cause repeated traversal. Similar Items continues to show same-layer peers.

A direct relationship remains visible even when an intermediate route reaches the same card. Authored references, grouped references, and canonical title components retain their direct links, supporting both あ → ある + あるく and あ → ある → あるく. Only relationships reached exclusively through another parent are excluded.

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

Dependency writes now enforce the visibility of every edge, including grouped references. Personal cards may use readable shared cards and their own private components; class cards require global or same-class components; global cards require global components. Update proposals validate their reference schema before submission, publication approvals recheck current dependencies, and edits cannot invalidate a pending publication. Moving shared content back to personal scope is blocked when shared dependants or pending requests still need its wider visibility. Permission hints are returned after creation and editing and respect class write access.

Deletion confirms all deletable cascade and restricted dependants, including grouped references, while detached cards remain. The transaction checks ownership, class access, protection, and pending review for every affected card before deleting anything. Restricted dependants reached by another cascade no longer fail due to traversal order. Shared creation offers a personal save when dependencies are too narrow. Publication assistance can request eligible leaf components, including hidden definitions, before submitting the parent after approval.

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

## Dictionary imports and drafts

Dictionary results can be reviewed before applying their pronunciations, classifications, tags, references, and separate sense definitions. Imported readings immediately use the same saved-value controls as manually committed readings. Generated readings update as the main input changes while preserving authored alternatives. Required tabs have one marker and the definition add action is compact.

The common lookup contract accepts `class`, `tags`, `definitions` (localized translations and provenance), and `sourceUrl`. Source-specific data belongs in provider-declared fields; the Japanese module declares hidden `dictionary_data` containing the full Jisho record. Existing scoped creation, conflict detection, dependency validation, and cancellation cleanup apply to imported definitions.

The Retrieve missing translations action calls `POST /api/v1/study/library/definitions/localize` with `{ translations, languages }`. It requests missing UI languages through `localization:translateString`, preserves supplied translations, and reports `missingLanguages` when a provider is absent or fails. Missing translations remain editable; English is not copied into other language fields. This is also available when adding a definition manually.

## Administrator creation and focused stroke lookup

Administrators create cards directly in the global namespace without Publish controls. Inline and dictionary-imported definitions use the same global destination; private dependencies must be published before saving. Stroke Pattern Lookup applies the provider’s stroke pattern immediately without opening the dictionary preview.

## Lookup fills the open composer

Dictionary lookup now fills the open card composer directly and commits all returned definitions and pronunciations without a result popup or Apply step. Existing values require replacement confirmation before the request; cancellation and empty or failed lookups preserve the current card. Successful Stroke Pattern lookup hides its button. Dictionary source URLs are retained in hidden source data instead of displayed as links.

## Resolvable imports and editable definitions

Dictionary imports map provider record IDs to the accessible installed cards before attaching ordinary or grouped links. Missing or ambiguous targets leave the returned values unlinked with a warning rather than preventing submission. Committed definitions expose an Edit action through the existing permission-aware card editor, and saved changes refresh their composer summary. Hidden schema fields, including dictionary source data, are omitted from forms while preserving their stored values.

## Composer lookup corrections

Stroke lookup is hidden whenever a retrieved pattern is present, including patterns loaded from dictionary results or saved cards. Clearing the pattern restores lookup. Definition editors keep translations in Content and omit the redundant Definitions tab. Dictionary meanings separated by semicolons become individually committed definitions, preserving aligned translations and original source metadata. Structured imported meanings replace aggregate source-definition links.

## Dictionary pronunciation links

Dictionary imports resolve complete pronunciations to installed Kana using longest complete matches, preserving compound characters such as きょ and っく and repeated positions. Canonical entry IDs are stored in ordered reading groups; a reading with missing characters is never partially linked. Definitions reuse matching cards or create cards through the normal composer flow. Carousels remain the primary way to create downstream cards. Characters and particles remain provider-owned read-only layers. Sentence composers do not offer dictionary lookup.

## Dictionary match selection

Vocabulary creation uses one composed card input without the redundant Input heading. Dictionary lookup sits directly beneath it and searches the complete text, including selected component cards. Vocabulary pronunciations are entered manually or imported from the dictionary instead of being generated from Kanji readings. One result fills the composer directly; multiple results open a horizontal list of card previews headed “Multiple Matches Found”. Click a candidate and Confirm to import its fields, pronunciations, definitions, tags, and relationships. Confirmation is disabled until a candidate is selected. Cancel preserves the current composer and creates no definitions. Dictionary-confirmed card text can be submitted, while subsequent text changes require resolution again. Sentence pronunciation remains derived from its constituents, and sentence dictionary lookup remains disabled.

## Preserved vocabulary input

Vocabulary dictionary lookup preserves the authored text, composed token order, and selected input cards while importing supporting fields, pronunciations, and definitions. The composer reuses matching definitions using the same normalized comparison as the API; newly imported definitions are cached immediately so repeated meanings do not cause conflicts. Reuse respects the destination scope and retains the existing definition translations.

## Transformed sentences and scope moves

Sentence creation, editing, and detail views derive pronunciations from each ordered reference’s selected transformation. Repeated roots retain separate positions and transformation paths. Declared punctuation remains visible without preventing adjacent title links; transformed title and reading links open the selected form and retain navigation back to its root. Scope moves execute the registered Study Library move flow, return updated permissions, and keep an owned card visible after moving it. The action reads “Move to: User” because shared cards return to the original creator’s user scope. Provider-owned content, shared dependants, pending requests, and ACL restrictions continue to block invalid moves. Contributor instructions explicitly prohibit advertising capabilities, actions, routes, or flows without executable implementations.

## Lean component implementation

Entry validation, identifier patterns, definition languages, and variant directions share focused helpers. Content audio handling has its own modules, and content packs use stable record identities directly.

## Dictionary search and caching

Cognis core owns dictionary caching through `core:cache`. A cached query becomes cold after one hour; its next use probes the provider for changes. Changed results remain pending until the twelve-hour publication boundary, and unchanged results retain their content. Concurrent queries share one probe, and failed probes preserve the last successful result. Cache state survives restarts. Modules retrieve provider data without scheduling queries or maintaining provider-response caches. Jisho has no lightweight change feed, so a probe requires the ordinary search response. There is no manual Refresh control. Local pronunciation and card links always resolve against currently accessible content.

## Review and relocation

Administrators and owners relocate personal cards directly into authorized shared scopes; ordinary learners submit review requests. The full text-and-icon destination control is clickable. Requests show the submitted card, proposed edits, scope, author, dates, decision status, and compact authorized actions. Decision history remains visible, including withdrawals. Card changes and decisions run in one database transaction with conditional pending-status transitions. Failed validation rolls back the decision; stale or repeated decisions report an error. Submission snapshots preserve reviewed content and prevent approval after the source changes.

## Efficient dictionary resolution

Dictionary results render after reference hydration succeeds. Preview resolution requests only referenced entry IDs or provider record IDs and the atomic characters needed for pronunciations; the complete carousel library loads when opening a composer or navigating a linked card. Entry lists hydrate references in one batch rather than querying each card. Request lists read source existence only after authorization and use saved downstream context for completed request previews. Hidden fields use the same visibility selector in search and review previews. Expired dictionary-cache rows are removed on cache writes using an expiry index. Approved relocations invoke the same registered move flow as direct relocations, inside the decision transaction.

Search also invokes the registered search flow on cache hits, so extension hooks apply consistently.

Study navigation requests only pending review items; the Requests page retains complete status history.

My Requests is a read-only history of every submitted status. Pending is the sole review queue. Request headers show requester/reviewer profile avatars and links; decision time is available on the status pill. The card title, primary pronunciation and definition share an expandable summary, with related cards grouped by relationship. Visibility downgrades use the cancel button style. Mixed relocation directions or unchanged destinations disable the control until the conflicting selection is removed.

## Dictionary reading graphs

Dictionary source data remains invisible metadata in composers and detail views. Imported pronunciations use hidden Vocabulary readings with the same scope as their parent. Multi-reading Kanji uses one hidden record per reading, with a title link to its source Kanji and ordered Kana pronunciation links; single-reading Kanji links directly to Kana. Complete word readings compose from the nearest authored Kanji-reading segments and remaining Kana when available. Definitions are linked directly to hidden readings. Cognis resolves provider identities and commits the graph atomically through normal field, layer, dependency and ACL validation. Characters and particles remain provider-owned. Redundant Katakana echoes of an equivalent Hiragana reading are filtered unless the dictionary declares that Katakana spelling; authoritative Kanji on-readings and genuine loanword readings are preserved.

## Validated operation stages

Repeated dictionary imports reuse matching hidden reading cards instead of producing duplicate conflicts. Owner validation and persistence execute within their named ctx stages; edits have an update flow and rejected hooks roll back writes. Invalid lookup bodies receive safe validation codes; unexpected internal failures return generic server errors. Shared definition validation lives in component-local reuse.

Core 0.3.109 · Library 2.24.43 · Study 1.8.44

## Composer and relocation

Hovering a carousel card highlights every matching placement instead of showing position counters. Pointer dragging reorders individual placements without selecting text. Typed verb suggestions use the transformation chooser, whose wider two-column layout preserves readable cards. Committed definitions support unlinking with a trash control and retain dictionary sense order. Rebinding page interactions removes previous listeners, and batch deletion has one in-flight confirmation.

Shared-to-private relocation requires confirmation and an administrator review request, including requests submitted by administrators. Approval recomputes inaccessible dependents and deletes their cascades atomically with the move; compatible personal cards remain. Protected or provider-owned cards and pending dependent requests prevent approval. Ordinary deletion permissions remain unchanged. Successful requests show a toast; owners of removed cards receive notifications in the Study category. The move-to-personal endpoint now returns HTTP 201 with a pending request rather than a relocated card.

## Dictionary transformations

Transformation choices align titles, readings and definitions in a single column within each card. The base-form action uses the neutral button style. Dragging displays a vertical insertion marker before or after the destination placement. Jisho imports retain supported conjugation-family tags on vocabulary cards; newly created verbs enter the transformation chooser before being added to a parent composition. Adverbs retain their lexical classification; the current Japanese schema declares no adverb transform sets.

Dictionary providers may return prerequisites: an array of { key, layer, label } lookup targets. After a composer match is selected, Cognis resolves existing compound-writing cards at the intended scope or retrieves and creates missing cards with their definitions and reading graph. Atomic characters and particles cannot be created through this path. Alias keys resolve to canonical IDs in root and hidden-reading references. Vocabulary input remains unchanged, and imported spelling references are used only while the input still matches the lookup. Search result browsing never creates prerequisites.

Missing required fields are completed through registered auxiliary lookup providers before persistence; Kanji stroke patterns come from KanjiVG. Each Kanji, its definitions and hidden readings commit as one validated scoped graph.

## Card identity and import flows

Merge conflicts invoke the registered merge flow: administrators apply additions immediately, while learners request review for shared cards. Canonical input composition and scalar values remain intact; alternate readings, meanings, tags and eligible hidden reading graphs are added. Private dependencies cannot enter shared graphs, and failed merges keep the draft. Dictionary matches with identical composition combine readings and meanings; expanded spellings apply immediately when selected, while Continue or closing the chooser uses the exact composition. Imported reading chips resolve through hidden cards to individual Kana, and editing removes the old grouped links before replacement. Successful creation shows a toast. Carousels sharing a relationship preserve each other’s selections, including sentence connectors.

Filters reflect visible content in the selected layer. Relocation preserves entry identity and records `relocatedAt`; moved cards are excluded from new-content indicators and announcements, even after repeated private/shared moves. New global cards and new provider records retain their normal notifications. Request snapshots include original downstream context for card details and definitions; authorized history keeps that context after relocation, while a deleted source is reported as unavailable.

## Nested child card layout

Expanded children occupy the closest available positions around the active branch; dimmed background cards do not push them across the grid. Fitted ancestors remain stable while deeper children open. When a branch needs more vertical space, the grid reserves scrollable space and releases it on close. Resize and card-size changes trigger a fresh fit. Branch visibility is controlled consistently for pointer and keyboard focus, and long-pressing a child continues the current branch. Pending layout work is coalesced and cancelled when the branch closes.

[Structured Library Import](/docs/adapters/study/library/import)

## Study Browsing and Favourites

Flashcards opens a browse page containing owned decks, decks shared with the current account, and complete starter decks from enabled language providers. Bearer-link shares retain their existing access rules and are not a public directory. The widget’s top-right + menu offers Create Deck and Import Deck. Explore, Library, and Flashcards reuse account-persisted Study favourites and sorting controls (provider order, A–Z, Z–A, newest first, oldest first). An outlined star filters the current results to favourites and turns gold when enabled. Library items, decks, and individual study flashcards have independent favourite toggles. Favourites never grant access to content. The drawing pad releases its session on route changes, and its floating boundary no longer overrides composer or shell classes.

## Dictionary Search Results

Dictionary searches open at `/study/library/search` without URL parameters. The owning gateway client saves the latest query, language and provider in account-scoped server preferences, retrieved through the authenticated session; another account cannot read that state. Multiple matches appear in a horizontally scrolling preview row. Selecting a preview updates the single detail view while preserving horizontal scroll. A single match opens directly in the detail view. Badge fields appear once as metadata, provider source data stays hidden, and creating a card uses the existing composer and dependency resolution. Dictionary cache expiry and refresh policy remain owned by Cognis core.

## Optional word forms and reachable previews

Each transformation set declares a required `flag`, such as `transform:verb` or `transform:plural`, alongside its grammatical `matchTags`. Only flagged base cards activate that family. Unknown or unproductive flags fail validation. Forms are read-only views identified by the canonical base UUID and `{setId, path}`; they cannot be authored, imported or shipped as independent cards. Genuine lexical homographs with a different grammatical class remain valid.

Explicit sentence title composition preserves whitespace between linked constituents, including multiword cards and selected transformations. Spacing remains plain text; canonical words and punctuation remain navigable. Missing constituents or undeclared punctuation still reject incomplete compositions.

## Pronunciation audio

Bootstrap requires `study:audio:provider` and registers one removable audio provider alongside dictionary and stroke providers. It resolves module-bundled recordings by spoken label and preferred reading, with bounded file reads and explicit missing-audio errors. Removal aborts pending retrieval. Cognis authorizes card access, derives selected transformation text from the schema, and caches recordings privately through Files without modifying authored fields. The `study:library:audio` flow executes authorization, validation and resolution; `study:audio:fetch` validates and retrieves provider bytes. Sentence audio remains ordered constituent playback.

Seed recordings use the offline Kokoro multilingual neural model with the English `bf_emma` and Japanese `jf_alpha` voices. Clips are encoded at 128 kbps with a 200 ms lead-in, a 180 ms tail, bounded peak normalization and slower speech. Model attribution and Apache licensing are recorded in `data/audio/VOICE-LICENSE.txt`; the recording inventory records the voice and processing settings.

Audio retrieval begins only when the learner requests playback. Merely opening a card makes no audio request. Playback failures use the host localized toast and structured logs. Sentence constituents retain their selected transformation descriptors; the authenticated audio endpoint derives the spoken form from the schema rather than accepting arbitrary display text. English letter-combination seed clips are synthesized from their authored IPA phonemes, while alphabet clips speak letter names.

## Dictionary audio and host caching

When a requested pronunciation is not bundled, English Study retrieves the word from the English Dictionary API and downloads a matching MP3 from its pronunciation media endpoint. A preferred IPA reading must match; a different pronunciation is never substituted. Only HTTPS media on `api.dictionaryapi.dev` is accepted, redirects are rejected, lookup and download share one deadline, and both responses have streaming byte limits. Missing recordings remain explicit errors. No Google speech service is used.

Cognis owns the recording cache, not the module. After authorization, its private Files cache reuses successful recordings across cards and restarts. Concurrent playback requests share retrieval and persistence. Keys include provider identity, revision, language, role, label and readings; a changed reading or provider revision resolves independently. Failed requests or writes remain retryable. The module contacts the dictionary only on a cache miss when playback is requested.

## Paced composition and replacement

An audio field is optional on sentence cards. On first playback Cognis authorizes every constituent, selects only the first pronunciation group, applies selected transformations, and creates one continuous WAV with a quiet lead-in and deliberate word, comma and sentence pauses. The generated recording is cached privately; constituent bytes, reading changes, transformations and pacing affect its identity. It is generated on demand for new cards as well as existing cards. Uploading an audio file in the normal composer replaces generated playback immediately. Removing that explicit file restores automatic composition. Providers supply lexical clips; Cognis owns composition and cache policy.

## Reference inventory coverage

The Japanese reference catalog includes all 13,108 characters in the packaged official KANJIDIC2 snapshot. The English catalog includes all 135,969 Open English WordNet lexical entries (127,311 normalized keys). These are separate lazy dictionary providers, not 149,077 eagerly imported seed cards. Choose Reference Dictionary in Study search to import supported entries through the normal graph validation. Source records without meanings or usable readings remain unknown; no pronunciation, translation or stroke diagram is fabricated. This inventory is not all Unicode Han and is not a claim to enumerate every possible English word.

Japanese Kanji readings are ranked from common JMdict attestations and available frequency markers, including okurigana forms; grouped links and seed audio follow that exact order. Kanji playback always uses the first authored pronunciation. Existing English word cards have one authored IPA reading; reference entries preserve authoritative order within the preferred British variety before other varieties. Pronunciation frequency depends on context, and the sources do not provide a universal frequency rank for every reading.

Rebuild the reference shards with `python3 scripts/import-reference.py --source <source-file>`; Japanese accepts `--priorities <reading-priorities.json>`. `data/reference/manifest.json` records the source checksum, attribution, counts and shard digests. Shards are loaded only for requested keys, and runtime lookup results use Cognis caching.

## Whole-reading reference audio

Japanese additionally ships 2,913 whole-reading neural clips in bounded banks under `data/audio/reference/`. Together with seed recordings they cover the primary readings of all 12,356 source characters that have a reading; the remaining 752 source characters have no recorded reading and do not receive invented audio. The bank index selects the first authored reading and checks file bounds and cancellation. Generate a plan with `python3 scripts/reference-audio.py plan --work <directory>`, render its inventories with the synthesis script, then use `pack` to write the bounded banks.

The Japanese ranking tool accepts `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` and optional `--content-root data/library/content`. It prefers common standalone lexical readings, ranks other readings from frequency-weighted alignments of attested words, and preserves reviewed isolated-card choices from `data/audio/primary-readings.json`. Voicing and gemination map back to canonical source readings. Kun, on and name readings remain available; a selected first reading alone determines playback and lookup cache identity. Source frequency markers are an ordering aid, not a universal pronunciation-frequency measurement.

Automatic composition requires recordings for its spoken constituents. Missing recordings remain explicit errors and can be supplied through the normal audio upload field. Reference spellings that cannot be linked to the packaged alphabet retain their source text and definitions without fabricated spelling links.

## Conceal writing answers

The drawing heading initially shows a masked character and a standard click-to-reveal button. Loading a different character masks it again. Floating sessions expose their current card through the removable `study:drawing:observe` capability. The matching Library preview stays open, blurred and non-interactive until the pad changes character or closes; pronunciation and meaning remain available in the pad. Embedded Writing uses the same concealment and reports reveals as assisted attempts.

## Reading Feedback and Links

Explore card links include canonical card identity in `/study/explore/<language>/<layer>/<card-id>`. Ctrl-click, Command-click and Shift-click retain native browser navigation, and direct navigation opens the requested card preview. Looking up an unanswered card counts as an assisted attempt. Ordinary navigation preserves the deck queue for browser Back.

## Saved Study Controls

New lexical cards automatically detect dictionary-backed classes and supported transformation tags when their input is committed and before saving. Manual tags are retained; ambiguous classes remain an explicit choice. Late lookup results cannot change a different draft. Selected verb, adjective/adverb and plural previews request the selected transformation’s audio. Source attribution in the heading links to the base card. Upload controls have a separate selector from playback audio, preventing the character-editor initialization crash.

## Reference Images and Review

Cards may declare an optional `imageList` field with `input.control: "imageFiles"`. Upload PNG, JPEG, WebP or GIF files (up to 5 MiB each) in the card editor; detail views display the images. Bundled images use relative paths under the content pack’s assets directory and retain their license attribution. Uploaded files remain private and are retrieved only through an authorized card or request. `PUT /api/v1/study/library/images` accepts image bytes; `GET /api/v1/study/library/entries/:id/images/:field/:index` resolves a card image. Authorized request previews use the corresponding `push-requests` path.

Requests show standard card previews. Open a pending proposed card to edit its staged fields; `PATCH /api/v1/study/library/push-requests/:id` is restricted to administrators. Saving a draft leaves the live card unchanged. Approval applies the draft and gives ownership to the submitting user and administrators who changed it; unchanged saves do not add owners. Submitter and approver profile previews have explicit labels. Approve, decline and withdraw each require confirmation. Enabled administrators receive Study notifications for incoming requests and decisions made by other users. The Requests navigation link remains static.

Browse controls include an immediate text filter over the cards already loaded on the page, combined with the selected filters and favourites.

## Media and Delivery Fixes

Reference images now load as thumbnails in the Library editor and its read-only detail view, including bundled module images. Uploaded thumbnails have a red remove control on hover or keyboard focus (always visible on touch screens). Removal needs no confirmation, clears the draft and file picker, and discards unused staged uploads. Closing an unsaved editor also releases previews and staged files; saved cards and request history retain their referenced images. The remove button has an opaque background so it remains readable over photographs. Custom image files and saved references persist across server restarts and provider reloads, including provider updates to edited cards.

Microphone recording waits for the browser’s permission response, blocks duplicate requests and saving while permission is pending, and releases a stream granted after the editor closes. Permission denial and unavailable recording have separate messages. Microphone, Play and Reload share one equally sized row. Collective Plural uses a single checkbox for its matching noun families; unrelated opt-ins remain hidden. Audio filenames are hidden. Play previews the latest staged upload or microphone recording; a delayed saved-audio response cannot replace it. Recording colors the microphone icon itself red, including while hovering; the button retains its ordinary theme styling.

Study notifications resolve current capabilities at delivery time, so startup order and component reactivation do not permanently disable delivery. The sender receipt is checked: an empty delivered-sender list is treated as a failure, partial failures are logged, and successful recipients and senders are auditable.

Global `ui:imagePreview` provides thumbnail rendering, binding and an `open` action through the registered `ui:imagePreview:open` flow. It is also available from `ui:reuse` as `image-preview.js`; its provider loads the shared stylesheet before publishing controls. Image buttons open the original image at its natural size, constrained to the viewport, with only the standard X control visible. Keyboard activation, Escape, focus return and owner/provider teardown use the shared popup lifecycle. Callers retain ownership of image URLs and optional removal actions. Library uses this shared control for uploaded and bundled images in editors and detail galleries.

The shared image-preview provider loads its stylesheet before publishing controls. The image-only popup removes heading markup and fits landscape, portrait and panoramic originals inside the viewport without horizontal or vertical scrolling. Library detail previews retain their 20rem × 18rem limits; editor thumbnails remain 8rem × 6rem.

## Study Media

Card detail reference images form a horizontal strip with a hidden scrollbar. Audio playback publishes the current card title, layer, Cognis artist and app artwork to the system media center, with play/pause/stop and lifecycle cleanup. Packaged sentence files take priority over generated composition. Companion modules ship 34 Japanese and 45 English direct sentence recordings; 124 Japanese kana clips were regenerated with native text and the explicit designated voice.

## Audio Regeneration

Regenerating a global card updates only its audio field and search index. Required identity, schema, classification, ownership, custom media and grouped references remain intact. An optimistic timestamp check rejects a concurrent edit instead of overwriting it. The regenerated cached recording is used on subsequent playback.

## Pronunciation Remove Control

Committed pronunciation chips place their remove button beside the reading components with a separate gap, including right-to-left layouts. Short and long readings keep the X clear of their content.

## Disabled Study Language Isolation

Study Library checks the live language capability before exposing retained schemas, cards, audio, images, packaged assets or review requests. Disabled languages disappear from browse results and direct reads fail; re-enabling restores access without deleting stored content. Runtime provider state remains separate from content persistence.

## Live Language Registry Lookup

Library availability resolves language contributions from the live system registry rather than the adapter-local capability store. Disabling one language keeps the other language’s schemas, cards and starter-deck dependencies accessible; re-enabling restores retained content. A public registry takes precedence over any stale local snapshot.

Authoritative pack updates retain omitted provider entries that are still reachable from user-authored cards or modified provider cards. This protection follows recursive dependencies and cycles; provider-only obsolete content can still be pruned.

The matching Explore grid preview is blurred and non-interactive while its character is open in the drawing pad. Repeated and newly rendered placements follow the same state; changing character, closing the pad or leaving the page restores them without changing card geometry.

## Decode Notification Text Once

Request notifications decode XML entities in one pass and interpolate account/request values once as literal data. Encoded entity text stays encoded at the next level. Empty or missing preferred-language strings use the English value; a missing English value fails explicitly. The four resource catalogs are cached for the notifier lifetime, and failed reads remain retryable.

## Generated Transformations

Each transformation set declares a required `flag`, such as `transform:verb` or `transform:plural`, alongside its grammatical `matchTags`. Only flagged base cards activate that family. Unknown or unproductive flags fail validation. Forms are read-only views identified by the canonical base UUID and `{setId, path}`; they cannot be authored, imported or shipped as independent cards. Genuine lexical homographs with a different grammatical class remain valid.

Rules transform spelling and pronunciation with suffix removal, suffix addition, optional prefix removal/addition, ordered `suffixes` alternatives and per-lemma `forms` overrides for irregular grammar. Overrides replace the generic text operation. Paths compose across multiple states, including multiword forms; repeating growth cycles fail. Definition templates interpolate once and keep inserted text opaque.

Detail views, sentence validation and audio use the same resolver. Generated views preserve reference images but clear base audio and stroke fields. Audio lookup uses the generated spelling and primary pronunciation; refreshing it does not modify the base card. Drawing composes the generated spelling from writing-unit patterns, preserving stroke groups and ignoring spaces. Provider recording tests require every enabled rule to have a path-bound clip. No materialized-card representation or compatibility aliases are supported.

The public provider contract declares `transformationModel: "generated"`; both language modules require it before registering providers. Every rule in an enabled family must resolve for that source. Rules may declare `resultClass` when a form changes grammatical class, such as an adjective becoming an adverb. Explicit invalid references fail rather than substituting the root.

The Library UI provider publishes `study:library:presentation.titleComposition(detail, schemas)` for consumers that need canonical, ordered heading items. It resolves authored reference groups, literal text and selected transformations through the same logic as Library detail titles. The capability is removed when its provider is disabled. Flashcards requires this provider and renders each linked heading item as a themed button; departure to Explore retains the selected transformation.

## Curated learner classifications

Layer `detail.tags` is an explicit allowlist of localized learner pills; internal tags remain stored for transformations and editing. Only tags marked `filterable` become tag filters. Field option labels are localized, and filters follow provider option order. Optional fields can declare `detail.autoSelectSingle: false` to keep the initial view unfiltered.

A string field can declare `derivation: { kind: "rankedReferences", relationships, values, requireAll, transformationValues }`. Values run from easiest to hardest. The field resolves through canonical referenced IDs, and selected transformation rule IDs contribute their declared ranks. An authored field value is a minimum grammar requirement. Sentences match exactly the hardest requirement: N5 + N4 matches N4, while N5-only and N3-containing sentences do not. Missing, ambiguous or inaccessible classifications remain unclassified when `requireAll` is true. Resolution is cached within each render, does not modify stored cards and refreshes with the referenced content.

## Generic difficulty profiles

Both Study modules use the canonical `difficulty_level` field. Their identical normalizer and contract tests read `data/library/difficulty.json`; labels, ordered options, source tag mappings, basic-layer defaults and transformation requirements are data. Japanese presents JLPT N5–N1; English uses its existing beginner/intermediate/advanced categories. Unknown values remain unclassified. The host ranks declared fields without language-specific rules or alternate field names.

## Mark every opened card as viewed

Opening a detail popup through a direct link, relationship or previous/next navigation records the canonical card for the authenticated user. Opening its editor follows the same path. Successful writes clear matching preview markers and local state; concurrent hover/open writes are coalesced, and failures remain retryable without blocking the detail view. Failed or cancelled opens do not mark unseen cards, and an opened detail never displays a stale New pill.

Optional single-select fields include a localized **Not specified** choice. Editing an unclassified card therefore preserves its unknown difficulty instead of silently selecting the first level.

Dictionary search-context reads use `study:library:readSearchContext` with authorize and resolve stages. Writes retain `study:library:searchContext` and add validation before persistence, allowing flow extensions to adjust input before service validation. Both operations reject shared-link principals. Writes stop at 16 KiB with HTTP 413; malformed JSON returns HTTP 400 and does not replace saved state. Unexpected failures expose only a stable error code.

## Notification and persistence fixes

Library content and deletion announcements include English, German, Indonesian and Japanese text from XML catalogs, use English fallback, and run through `study:library:notifyContent`. Card labels remain opaque during interpolation. Privileged class writes still require a real target class. Leaderboard observations roll back on failed persistence; season rollover rebuilds final standings after restart and restores state if saving fails. Verified administrators can release matching integration source bindings without room membership.

## Empty offline Study pages

Prepared Study pages remain navigable in a verified, consented offline session even without private content snapshots. Missing language/preference metadata produces empty navigation data. Explore mounts its normal empty browser and shows “No offline cached content available” instead of route-unavailable feedback or error toasts. Flashcards also retains an empty page when deck data or a required view resource is missing. Notices are scoped to the current page and deduplicated. Cache misses do not conceal access or consent denials. Library and flashcard providers prepare their public translations and light templates online; private data stays in the bounded tab-local caches.

## Offline Study Assets

Both theme variants of popup icons are prepared through the host’s scoped offline asset capability. Cached browsing and drawing remain available; content editing is disabled offline, including Edit on an already open popup when connectivity is lost. Missing decorative icons display their translated action label.

## Offline Availability

The offline route registry survives repeated bundled and directly served imports. Prepared route descriptors retain availability when reconstructed with the same script, styles and capability providers; changed assets require preparation again. Messages prepares its room list, translations and emoji catalogs after verified sign-in. The page can open offline before its first online visit; only cached rooms with cached threads open automatically, and selecting an uncached thread gives a targeted information toast. Explore keeps available cached collections when another collection or viewed-marker snapshot is missing. Access and consent denials still propagate. Banner actions sit directly in the shared action row, removing the inherited vertical offset.

## Shared Study Favourites

The Study provider exposes `study:favourites` with scoped `load`, `toggle` and `has` operations. Rendering utilities resolve this ctx capability instead of keeping a separate cache for each loader. Favourites prepare after verified authentication, overlay pending changes and share account/session-bound state across Explore, flashcards and repeated imports. Missing optional favourite snapshots produce an empty selection with queued changes applied; they do not hide cached content or show an update-failed toast. Account changes clear the visible selection and access denials are never treated as cache misses.
