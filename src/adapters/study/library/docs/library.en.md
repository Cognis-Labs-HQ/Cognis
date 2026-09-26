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

Layers with the `atomicWritingUnit` or `compoundWritingUnit` role declare required standard `pronunciation` (`stringList`) and `audio` (`audio`) fields. Content packs supply MP3, Ogg, WAV, WebM, or M4A files as authenticated pack assets. The Library stores these files in its component-managed `study-library-audio` namespace through the Files gateway. Persistent storage, quotas, and physical file handling remain the Files gateway's responsibility, while every playback request still enforces the entry's scope. Character and alternative-character pronunciations appear beside the writing unit in cards and detail titles; word and sentence pronunciations remain below their text. A module may model a meaningful single-character word by giving a lexical-unit record one character reference. Character details then list those inbound word relationships without synthesizing content in the Library. Writing-unit pronunciation beside a popup title uses the popup’s escaped secondary-title contract, with smaller regular-weight text. Audio surfaces opt out of forced-color substitution and neutralize native control saturation in dark mode.

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

Learner-facing layers use independent `/study/layers/:schema/:layer` SPA routes linked directly from Study sub-navigation. These pages reuse the rich card renderer, filters, variants, definitions, metadata, and detail popups without exposing administrative editing controls.

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

For ordered lexical sequences, only relationships whose `presentationRole` is `composition` (or omitted for legacy composition relationships) contribute to label reconstruction. Pronunciation and alternate-spelling links may target lexical layers and reuse positions without being mistaken for sentence constituents.

Detail views omit the `composite` class. Other content classes are reduced to their human-facing final segment and rendered as pills (for example, `lexical:noun` becomes **Noun**). Composite headings place alternate readings and pronunciation beneath the primary reading while retaining the definition in the adjacent column. Reverse vocabulary navigation suppresses same-label lexical entries so a correct word-to-writing-unit spelling edge does not appear to recurse back into itself. A linked title-detail spelling is also omitted when both its normalized text and target match a link already composing the primary title. Relationships without a resolver or presentation role are dependency-only edges: they remain available to reverse navigation and deletion policies without being inferred as title composition. Detail views combine vocabulary usage and other inbound dependencies into one **Used By** section, preferring the vocabulary target when multiple records have the same normalized label. Composite popup headings use a compact row gap between the primary title and its reading detail, while card previews keep remaining title and definition text centered after deduplication.

## New-content tracking

The Library stores viewed entry UUIDs per account. Provider updates preserve this state and notify enabled accounts only for newly introduced stable entry IDs, not for the pack's complete updated contents. Global entries introduced by provider pack ingestion or approved user and administrator contributions trigger a Study Library notification for enabled accounts. Entries absent from an account's viewed cache display a **New** pill in previews and detail popups. Hovering a card or opening it through any Library relationship records it as viewed; the persisted state removes the pill after refresh.

## Contributions, visibility requests, and search

Users can create cards in their personal namespace, teachers can also create in classes they own, and administrators can additionally create global cards. Language providers shape layer-specific form fields through `study:library:registerConstructor`; visibility, class selection, and definition-preview controls remain adapter-owned. Before personal or classroom creation, the Library reports an identical visible global entry and requires explicit confirmation. The creator defaults to personal scope; eligible administrators can opt into global publication, while teachers can opt into only those writable classes whose language matches the active schema.

Personal cards can be published to an enrolled class for its teacher to review or to the global collection for an administrator to review. A pending request can be withdrawn by its submitter; after approval, ownership leaves the user and the original card is moved rather than copied. Only the responsible teacher or an administrator can then edit, delete, or send it back to the original submitter's personal namespace. Provider manifests may set `protected: true`; protected entries cannot be moved or deleted. Imported and user-created records persist normalized search text, and the Library side menu searches every layer while hiding empty results.

## Language-owned card constructors

A language pack can place a `cardConstructor` on each creatable layer in its schema. The specification supplies the localized primary-label prompt, ordered field and relationship IDs, provider defaults, and whether Cognis should expose the hidden-card or preview-definition switches. Cognis adds role-authorized visibility and class controls around that specification; a layer without a constructor is deliberately read-only for creation.

Creation presents every relationship collection without scrollbars or directional controls. Hover previews use the current UI language definition. Selected or suggested items become draggable composition blocks, their stable IDs generate relationship references, and pronunciation is derived recursively from referenced writing units. Definition creation requests all supported UI-language translations.

A runtime language module may instead resolve the public `study:library:provider` ctx capability, call `ingestContentPack(moduleRoot)`, and call `registerConstructor(...)`. Constructor IDs are validated against the registered schema before the form is exposed. The returned remover lets module disablement cleanly unregister a runtime constructor.

## External package contract

`study:library` is the authoritative boundary for executable providers and data-only content packs. A pack owns exactly the namespace named by both its manifest and schema. Schema, layer, field, relationship, constructor, and option labels are localized maps. Provider metadata may add JSON-compatible values; Cognis validates every value, stores the complete schema, and returns it unchanged from `listSchemas()` and `GET /api/v1/study/library/schemas`. Unknown field types are accepted only with a declarative `validation` rule, so extensions cannot bypass content validation. Built-in types cover strings, finite numbers, safe integers, booleans, string lists, localized text, and singular or list asset/audio references. Pack protection, semantic roles, grids, detail hints, activity compatibility, definition localization, interest veins, licenses, and assets are part of this versioned contract. The synthetic external-pack fixture under `tests/fixtures/` is the compatibility reference for provider CI; external providers should inspect their production pack with the installed `study:library` capability before release.

Direct executable schema registrations remain immutable by schema version. A newer release of an authoritative content pack may, however, revise the stored schema document at the same compatibility version when every installed owner of that schema version has the same publisher and pack ID. Cognis rejects collisions with independently registered or differently owned schemas, updates the schema and entries in one transaction, and refreshes the in-memory schema after the transaction succeeds.

Content records may declare a namespaced `class` value such as `lexical:noun` or `lexical:verb`. The Library validates and preserves this provider-neutral classification for future class-aware rendering and activities. List-valued local audio references are cached individually, list-valued assets are rewritten to authenticated URLs, and installation receipts preserve manifest metadata.

## Publishing requests

Library publishing requests live on the dedicated **Requests** Study sub-navigation page rather than in page toolbars. When an administrator or teacher has a pending request they can review, the Requests link uses an accessible red breathing outline; resolving the final review removes the attention state. The animation becomes a static outline when reduced motion is requested.

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

Creation excludes particle layers. Sentence and composite input restores every provider relationship carousel, including vocabulary, particles, alternate characters, and characters, while deriving pronunciation without a separate pronunciation editor. Vocabulary and alternate-character constructors include character-based pronunciation selection; those selectors show primary character values and stage the selected spelling before committing its derived pronunciation.
Pronunciation composition mirrors input composition: type free text in the staged input or select atomic character cards from the character carousel, then commit the combined pronunciation. Vocabulary and alternate-character pronunciation selectors never substitute vocabulary cards for atomic characters.
