# Study Library Improvements

**Feature Branch:** feature-update-external-package-contract-definitions

Card composers confirm cancellation before discarding edits. Carousel selections append repeated card placements, and dragging reorders individual placements. Sentence pronunciation previews box each source component; redundant input feedback is omitted. Carousel hover previews show only the primary pronunciation and definition, positioned within the viewport.

## Register scoped audio retrieval

Both Study modules expose the same removable audio-provider contract and retrieve bundled recordings with bounded local reads. The host owns authorization, cache policy and composite playback.

## Ship seeded pronunciation recordings

Spoken seed cards include deduplicated offline-generated MP3 files and voice attribution. Sentences continue using ordered constituent playback.

## Keep hover hints clear of previews

Long-press hints stay on one line within the reserved footer space, with visual ellipsis when needed and the complete translated text retained in the tooltip. They no longer wrap over English preview content.

## Link spaced sentence constituents

Sentence detail headings preserve spaces between canonical word links and selected transformations. English sentences now expose their constituent words; incomplete compositions remain rejected.

## Separate transformation navigation

Transformed-card details place Return to on its own row, keeping Previous and Next together below it.

## Render adapter navigation labels

Study navigation renders Requests and other adapter links from their declared localized route labels, without requiring adapter locale bundles on the Study hub. This preserves strict missing-key errors for gateway-owned XML translations and avoids duplicate adapter links.

## Release loading on cancellation

A cancelled direct page releases its shared loading token immediately, even while translation, provider or composer initialization is pending. Resource cleanup remains bound to the same host signal.

## Direct-page lifetime and bounded parsing

The host `mountWhenDirect` helper supplies `mount(root, { signal })` with an AbortSignal that ends on committed route navigation or page exit. Pages bind cleanup to that signal and check it after asynchronous initialization. Failed mounts abort owned resources; cancelled work cannot publish errors on the destination page. Markdown link labels separate escaped characters from ordinary characters to avoid ambiguous backtracking. CI requests read-only repository contents.

## PiP close control

Floating-window close controls use the served shared close SVG with theme-aware color. Their visible hover tooltip uses the same localized action label as the accessible name, rather than inheriting a surface title.

## Persistent viewed-content cache

Cognis now stores viewed Library entry UUIDs per account. Hovering a card or opening it directly or through a relationship marks it as viewed without exposing another user's history.

## New-content indicators and notifications

Unviewed entries that have never been relocated display a one-time **New** pill in previews and detail popups. New global cards and new provider records notify enabled users; moving existing cards between scopes does not.

## Scoped contributions and review workflows

Users can create personal cards, teachers can also create cards in their own classes, and administrators can create global cards. Promotion requests now move approved cards to teacher-owned classes or the global collection, while authorized downgrades return them to the original submitter. Provider-protected cards cannot be moved or deleted.

## Searchable and configurable Library UI

Language providers can shape layer-owned creation fields through a ctx capability. Global duplicate detection pauses creation for confirmation, imported records carry a persistent search index, Library search spans every layer, optional preview definitions render below card content, and multi-select controls now occupy the requested card-edge positions with restored floating actions.

## Language-defined creation is complete

Language packs can now declare a validated `cardConstructor` for each creatable layer, or register one through the public `study:library:provider` ctx capability. Cognis composes the provider fields with role-aware visibility and class controls, shows class selection only when needed, and exposes review requests to authorized teachers as well as administrators.

## Bounded card status and contextual publishing

Card-edge scope, New, and selection controls now stay within each card’s horizontal bounds, while constrained previews reserve most space for their primary value. Multi-select now offers a hoverable Publish to menu, a real localized delete label, pending-request withdrawal, and authorized send-back actions without a redundant close button.

## Concise links and smarter discovery

Related-item controls now show only each card's primary value. Child cards have clearer surfaces, stronger background separation, and independently hoverable New markers. Detail popups suggest similar same-layer items using writing, vocabulary metadata, and shared relationships, while language providers can expose additional metadata fields as learner-facing filters.

## Authoritative external package contract

The Study Library now validates and preserves localized and provider metadata, extensible declaratively validated field types, asset lists, package ownership and protection, semantic presentation, definition localization, interests, and activity compatibility. A synthetic package fixture mirrors a production provider structure, and the public provider capability can inspect a real pack without installing it.

## Library browsing and provider lifecycle fixes

Library search and edit controls now follow compact, theme-safe styling. Right-click selection is captured reliably, nested child cards retain hover hitboxes, and non-character cards show full readings and definitions without needless truncation. Content providers now authoritatively control language availability. Content records support namespaced classes, media lists survive ingestion, custom editors follow validation contracts, built-in constraints are enforced, and installation receipts retain provider metadata.

## Stable Library controls and balanced sentence cards

Sentence cards now use a consistent bounded height, omit redundant pronunciation previews, and clamp primary text and definitions to two lines. Search exposes one controlled clear action, edit icons render from explicit themed assets, deletion dialogs have localized labels, and vocabulary details include kana readings. Right-click selection is captured at the document boundary on every mounted Study page, while authoritative provider upgrades prune records omitted from the latest pack unless a partial pack explicitly opts out.

## Dedicated publishing-request navigation

Publishing reviews now live on a dedicated Requests page in Study sub-navigation instead of consuming Library page toolbar space. Reviewable pending requests give the Requests link a red breathing outline with a reduced-motion fallback, and the signal clears when the final review is resolved. The Library search clear icon now adapts to both light and dark themes.

## Language-scoped administration and guided card editing

The Library administrator now shows a flat layer menu for the selected language. Card classes are visible and safely editable, definitions and composites receive enforced classes, definitions stay learner-hidden, particles and provider-locked records cannot be edited, and edit dialogs provide clear View/Edit modes, Save actions, and unsaved-change protection. Card creation moved to a guided `+` page action on learner-facing layer pages, request status is available to submitters, popup title readings retain provider links, and Study language availability is refreshed on every page load.

## Reliable learner card actions

Learner cards now keep a selectable control regardless of deletion rights, so right-click reliably enters multi-select without opening the browser menu. Creation actions now discover provider-contributed card constructors and register the + control through the page-action CTX capability.

## Localized Requests navigation on first load

The Requests navigation item now receives localized fallback labels from its owning Library route, so a fresh server or browser load never exposes the internal `/study/library/requests` path while translation bundles are still loading.

## Ordered sequence relationship roles

Content-pack validation now reconstructs ordered sequence labels only from composition relationships. Pronunciation and alternate-spelling relationships can target lexical records and use their own position sequence without causing `ordered_sequence_content_unresolved`, matching the Japanese learning provider contract.

## Clear content-class and reverse-link details

Detail views now hide the structural composite class, humanize provider class suffixes into pills, and use a two-column composite heading with readings below the primary text. Same-label reverse vocabulary links are suppressed without removing the authored forward spelling relationship.

## Focused child-card branches

Opening a child-card branch now blurs unrelated cards’ visibility icons and neutralizes hover elevation and highlight styling on other parent cards. The active branch remains crisp and interactive.

## Safe same-owner schema evolution

New releases of an authoritative content pack can now revise their own stored schema at the same compatibility version. Ownership checks retain schema collision protection, and the schema cache updates only after transactional ingestion succeeds, allowing the latest Japanese pack to enable cleanly over its previous release.

## Reliable multi-select controls

Study Library now keeps its floating action menu available whenever cards can enter multi-select mode, including views without deletable provider records. Selection checkboxes also use a pointer cursor so their interactivity is visually clear.

## Disabled languages and durable learning state

Disabled language modules are now absent from Study even if a stale provider capability remains during lifecycle refresh. Content-pack updates preserve viewed-entry tracking and notify accounts only for genuinely new stable records instead of announcing the full pack again.

## Deduplicated linked title details

Library detail headings now compare normalized text and link targets across the primary title and its secondary spelling details. A spelling already linked in the primary title is omitted from the detail line without suppressing same-text links to genuinely different records.

## Dependency-only reading relationships

The external-package contract now treats relationships without resolver and presentation roles as dependency-only edges. They remain persisted for reverse navigation and deletion protection without being inferred as title composition, matching the Japanese provider’s `reading-kana-dependency` graph.

## Unified reverse relationships

Library details now combine vocabulary usage and other inbound dependencies into one Used By section. Visually duplicate normalized labels collapse into one link, with vocabulary relationships taking priority.

## Balanced title alignment

Composite popup titles now sit closer to their reading detail through a compact row gap. Card preview titles, readings, and definitions remain centered when relationship deduplication removes an adjacent item.

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

The default vault budget is 2 MiB, with an absolute in-process limit of 8 MiB. The effective policy is returned to clients. PUT counts incoming bytes before buffering or JSON parsing and rejects oversized requests; GET checks stored size before parsing. Ciphertext envelopes use a base row plus bounded overflow rows, with atomic replacement and deletion and a single joined read. Each stored chunk is at most 60,000 UTF-8 bytes; the server still never decrypts secrets.

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

## Provider-assisted composer lookup

Compatible content providers can now register localized lookup services through the public Library ctx capability. The card composer displays one action per service, sends that service the raw input, and applies its highest-confidence canonical label, fields, and ordered references.

## Public capability enablement

Module enablement now recognizes public server capabilities contributed through the system ctx. Japanese and other language modules can require `study:library:provider` without receiving a false unavailable-capability conflict, while private capabilities remain hidden.

## Reliable Library forms

Card updates now preserve unordered references without invalid positions. Relationship tabs are view-only, compound characters use a free Input field and pronunciation carousel, lookup actions appear inline after typing, stroke patterns stay provider-owned and hidden, definition add controls are larger and neutral, and hover previews fully enclose their content.

## Reliable built-in card editing and packaged audio

Library updates now use the database gateway's structured update contract, so editing built-in cards no longer fails inside PostgreSQL. Audio playback is offered only for files shipped through a content pack and stored by the Files gateway; external placeholder URLs are neither displayed nor fetched. Definition summaries show localized translations in a compact language-labelled layout instead of exposing provider keys and raw JSON.

## Stable drawing completion

Drawing feedback now animates only the canvas stage, so ending an animation cannot replay the pad's opening transition or make the window flash. A new attempt begins with the complete character guide, then advances one full stroke at a time after the first accepted stroke. Completion displays a tick, Well Done message, attempt mistake count, and Close or Try Again actions.

## Audio playback and pronunciation editing

Authenticated pages allow browser-generated media URLs, so newly uploaded card audio can play without violating Content Security Policy. Audio editors show the current filename, and speaker icons follow the application theme. Compound-character pronunciation carousels now replace the tag-entry control inside the Pronunciation field, use provider target-layer names, and number characters by their order in the card text rather than stale relationship positions.

## Provider-linked pronunciation and durable card edits

Pronunciation fields linked to provider relationships now render their ordered selectors directly in the field instead of retaining free-form tag input. Once a user changes a provider-installed card, later provider reconciliation preserves that card and its relationships.

## Two-step pronunciation composition and stable audio

Pronunciation editors now choose semantically compatible component cards, preview card pronunciations, and commit each derived reading before composing another. Carousel previews fully contain their text, audio controls remain visible in every theme, and replacement audio uploads reuse a stable card-specific key.

## Guided stroke order and adaptive Drawing Practice

The initial guide now numbers every stroke and draws a direction arrow. Ten consecutive mistakes produce a “Loser!” result with an X, while completing a card with zero or one mistake raises its remembered in-memory difficulty. Selecting another drawable Library card while the pad is open loads it directly into the same pad.

## One-time guidance, composite practice, and shared audio

Full drawing guidance now appears only on the first attempt or after the explicit ? reset. Retry preserves progressive guidance, while composite cards derive ordered character stroke groups and preview each newly reached piece. Lexical and sentence cards cannot own stroke patterns. Provider alternate characters reuse related character audio, user uploads remain authoritative, and the speaker uses an inline theme-safe SVG.

## Composite writing and reliable creation

Vocabulary drawing now follows the primary written form and arranges every resolved character side by side while the pad heading includes readings and meaning. Shared form composition now marks required creation fields consistently, preserves provider-supplied stroke patterns, validates alternate characters through dictionary lookup, embeds character pronunciation selectors, and cleans up carousel previews when dialogs close.

## Reliable editing, drawing, and composition

Card updates and audio playback now migrate through the provider’s current schema, and detail dialogs retain their edit action after editing. Drawing practice stays bounded, resizes predictably, annotates single-stroke guidance, uses vocabulary spelling instead of pronunciation, and excludes sentences and composites. Card creation excludes particle cards, restores all composition carousels for sentences and composites, and provides staged character-based pronunciation selectors for vocabulary and alternate characters.

## Precise nested composition

Nested child-card branches now retain their provider-assigned side when they fit, nested creation dialogs always stack above their parent, and pronunciation composition now matches the input composer with a staged text field and atomic-character carousel.

## Provider-directed composer carousels

Card constructors now explicitly separate primary-input and pronunciation carousel relationship IDs. Alternate characters require resolved pronunciation relationships without requiring primary references, lookup results receive safe provider metadata defaults, and child-card placement no longer drops branches when the declared grid has no remaining capacity.

## Strict composer declarations

Removed inferred carousel behavior: every card constructor must declare both carousel arrays. Server validation now uses runtime form constructors, edit forms render the declared pronunciation carousel, audio replacement keys use normalized card names, and diagonal child cards retain their assigned placement.

## Provider-driven carousel restoration

Card constructors now identify input and pronunciation carousel sources by target layer. Cognis maps those declarations only to relationships with the matching presentation role, so pronunciation carousels render again while alternate-character primary references remain optional.

## Review feedback and reliable composer placement

Content-pack pruning is now publisher-qualified, push requests use the database contract correctly, and deletion checks consider only pending requests. Generic constructors, class publishing, raw compound labels, repeated pronunciation branches, nested-definition rollback, unique audio uploads, compatible schema evolution, and removable pronunciation links are reliable. Speaker assets now render through explicit themed images, while relationship carousels live beneath their intended content fields.

## Existing-card carousel editing

Existing cards now derive both input and pronunciation carousel configuration from their provider constructor. User-facing and administrative edit popups render the same ordered carousel controls as creation while retaining existing selections.

## Accurate extended drawing guidance

Drawing annotations now calculate their direction in rendered canvas coordinates, preventing drift on the second and later characters of extended inputs. The ? guidance action preserves accepted user strokes and annotates only unfinished work.

## Collision-aware drawing annotations

Stroke numbers now choose the clearest available position around each start point, avoiding other annotation bubbles and rendered stroke paths so guidance does not cover completed user work.

## Unified creation and editing contracts

Creation and edit popups now consume the same provider card-constructor contract for fields and relationship carousels. Alternate characters can compose pronunciation from characters while keeping unrestricted input; vocabulary, sentence, and composite pronunciation is derived recursively from configured input parts.

## Remove derived pronunciation tags

Vocabulary, sentence, and composite edit forms now suppress the generic pronunciation list control unconditionally and continue deriving pronunciation from their ordered parts. Generic list fields use newline-separated text instead of tag chips.

## Progressive recall drawing

Low-mistake completions now hide one additional random stroke guide per card while retaining normal validation. A canvas question mark signals hidden guidance, the top-right ? reveals it without clearing progress, and annotation labels use closer safe placements.

## Always edit pronunciation with the composer

Visible pronunciation fields now always use the pronunciation composer in create and edit dialogs. Pronunciation carousels declared by the card constructor remain layer-specific and appear inside that composer, while layers without declared relationship carousels can still enter unrestricted pronunciation segments.

## Derived audio sequences with clear missing-audio feedback

Vocabulary and sentence cards without their own upload play the audio of their ordered parts in sequence. An optional card-level upload overrides the derived sequence; when a dependency lacks audio, a localized hover tooltip explains why the speaker is disabled.

## Carousels connected directly to pronunciation

The unified composer interface now adds relationships implied by input or pronunciation carousel layers to the effective constructor automatically. Pronunciation carousels therefore load reliably in create and edit dialogs, and their selection updates the hidden pronunciation field immediately without a separate free-text field or commit button.

## Pronunciation carousels restored from schema relationships

Compound writing units compose pronunciations from atomic writing units. Lexical units use atomic writing units for pronunciation and writing or lexical units for input. Ordered lexical sequences derive pronunciations from their selected lexical units and particles. These semantic roles define the current composer contract.

## Semantic carousel profiles match the authoring contract

The composer now normalizes card constructors to the requested semantic profiles: alternate characters receive free Input plus character Pronunciation; vocabulary receives character, alternate-character, and vocabulary Input plus character Pronunciation; sentences receive particle, alternate-character, and vocabulary Input with no editable Pronunciation. Vocabulary pronunciation is pre-populated down to the character layer, while sentence pronunciation is derived exclusively from it.

## Characters and particles are immutable

Atomic characters and particles can no longer be created, edited, submitted for update, or deleted through either the UI or direct API calls. Permission projections remove edit and delete actions even for administrators and owners, while entries remain available for read-only browsing.

## Timely hidden-guide prompts

Drawing Practice now shows the canvas question mark only when the currently required stroke has a hidden guide. Future hidden strokes no longer produce an early prompt.

## Composition-wide carousel positions

Study Library Input carousels now share one ordered counter sequence in create and edit popups. The badges reflect the complete saved composition across relationship carousels instead of restarting at one in each carousel.

## Provider-owned layer names and valid derived pronunciation

Library authoring no longer presents an internal Content Class choice between semantic labels such as sentence and composite. Provider-localized layer names identify cards instead, ordered records persist the provider layer ID, and automatically derived pronunciation now follows the provider field type so list-valued pronunciation fields submit successfully.

## Required derived pronunciation fields remain discoverable

The composer now resolves derived pronunciation field definitions from the complete provider schema rather than its display-filtered editor layer. Sentence and other derived composers therefore populate required pronunciation fields even though those fields have no direct input control.

## Selected-card fields accompany every configured carousel group

Input and Pronunciation sections now always show their selected-card field when the constructor declares carousels for that section. Existing selections populate the field, carousel changes update it immediately, and selecting a displayed card removes it through the same carousel state.

## Multi-value carousel composition and safe deletion

Provider fields can opt into multi-value composition with `multi_value`. The composer adds a field-specific save action and committed-value pills, supports reopening values for replacement, limits typed suggestions to cards in the configured carousels, rejects unresolved floating text, and confines confirmed deletion to dedicated × controls. Existing-entry editors now mount their declared carousels consistently with creation forms.

## Administrator creation and focused stroke lookup

Administrators create cards directly in the global namespace without Publish controls. Inline and dictionary-imported definitions use the same global destination; private dependencies must be published before saving. Stroke Pattern Lookup applies the provider’s stroke pattern immediately without opening the dictionary preview.

Related stylesheet, validation, persistence, constructor-alignment, and test code is split into focused files to satisfy repository size checks; documentation structure and UI test discovery are corrected.

## Lookup fills the open composer

Dictionary lookup now fills the open card composer directly and commits all returned definitions and pronunciations without a result popup or Apply step. Existing values require replacement confirmation before the request; cancellation and empty or failed lookups preserve the current card. Successful Stroke Pattern lookup hides its button. Dictionary source URLs are retained in hidden source data instead of displayed as links.

## Resolvable imports and editable definitions

Dictionary imports map provider record IDs to the accessible installed cards before attaching ordinary or grouped links. Missing or ambiguous targets leave the returned values unlinked with a warning rather than preventing submission. Committed definitions expose an Edit action through the existing permission-aware card editor, and saved changes refresh their composer summary. Hidden schema fields, including dictionary source data, are omitted from forms while preserving their stored values.

## Multi-value staging no longer mutates committed values

Field-level `multi_value` is now ingested as the canonical contract. Committed pills remain separate from an initially empty staging field, the visible Save action alone commits staged references, and compact × controls remove staged cards without confirmation or changing saved values. Clicking a committed pill no longer reloads it into staging.

## Canonical labels and immediate previews

Card forms no longer expose a separate Label field for non-definition cards. The label is generated from the ordered primary Input composition, and saving a direct edit immediately rerenders the card browser so its preview matches the stored entry. Multi-value fields now accept only the field-level `multi_value` contract; the nested spelling introduced during this branch has been removed rather than retained as compatibility code.

## Unclipped tooltips and carousel previews

Missing-audio tooltips now use viewport-aware body portals instead of card-local absolute positioning, preventing popup and card overflow from clipping their text. Every carousel item again carries a hover and keyboard-focus preview, even when no secondary definition text is available.

## Grouped multi-value pronunciations

Aligned the Library contract with the Japanese learning provider’s grouped pronunciation graph. Relationships can declare `grouped: true`, and entries can carry relationship-keyed `referenceGroups`, where every nested ordered character array belongs to one distinct pronunciation. Content-pack validation, hashing, storage, APIs, create/edit composers, title links, and derived audio traversal now preserve those boundaries end to end.

## Hidden cards stay out of carousels

Composer carousels, free-text card suggestions, and pronunciation suggestions now exclude entries marked hidden. Existing cards retain any already-authored hidden dependency through their underlying relationship value, without exposing that dependency as a selectable carousel card.

## Sparse pronunciation groups no longer break entry reads

The Library store now compacts missing grouped-reference indexes before sorting each group. Loading entries with sparse persisted group indexes no longer throws while preserving deterministic pronunciation order.

## Card previews keep pronunciations concise

Library cards now show only the first two pronunciations. Additional pronunciations remain available in the complete entry detail view.

## Grouped pronunciations de-duplicate correctly

Nested character sequences are now joined into complete readings before pronunciation labels are compared. A grouped reading matching the card value is no longer displayed twice.

## Rendered pronunciation links no longer repeat titles

Pronunciation de-duplication now compares the joined labels of linked character cards with the displayed card value. The comparison normalizes whitespace and Unicode representation, so equivalent linked readings are omitted regardless of their stored field shape.

## Multi-relationship pronunciation groups validate correctly

Aligned group indexes across multiple field link relationships now represent the same multi-value field item. Validation uses the greatest linked group count rather than summing parallel relationship counts, allowing the latest Japanese content pack to enable successfully.

## Pronunciation details descend and drawing redraws stay proportional

Pronunciations matching a card value now descend to the linked cards’ pronunciation values instead of repeating the same spelling. Drawing Practice also reapplies stage proportions and synchronizes its canvas when an open window loads a pattern with a different column count.

## Escape closes Drawing Practice

The active Drawing Practice window now closes with the Escape key using its normal animated cleanup path.

## Reading titles preserve complete spelling groups

Title de-duplication now removes only complete duplicate reference sequences, never individual characters from a pronunciation. A spelling matching the primary value resolves to its character-layer pronunciations, preventing partial readings and primary-value discrepancies while retaining the provider-authored Kanji reading list.

## Composer deletion is precise and missing definitions preserve work

Only the compact × button now removes a staged card; the rest of the composition field is inert for deletion. Creation validates provider relationship minimums before dismissing the popup, so missing definitions show a toast and preserve all composer input for correction.

## Readable title details and composer limits

Long pronunciation and definition details now remain beside the primary value within a 40% width and wrap into additional rows, with an em dash clearly introducing definitions. Card creation limits authors to 8 tags, 10 definitions, and 16 pronunciations and reports each limit through a localized toast.

## Dense heading arrangement and edit limits

Pronunciation-driven headings now place the speaker below the scope icon, keep readings in a 40%-wide wrapping cluster, and let definitions form independent rows to the right. The same tag, definition, and pronunciation limits are now enforced by both create and edit composers.

## Adaptive diagonal child-card placement

Expanded character-child branches now test diagonal positions across both sides whenever their preferred direction overflows or collides. Visible root cards participate in collision scoring, so child cards and connector arrows remain inside the Library canvas while choosing genuinely free diagonal slots.

## Sentence components and transformation trees

Language providers can mark sentence transitions with a provider-owned tag and expose them through a sentence-only filtered carousel, while repeatable punctuation literals use a one-line read-only carousel. Tag-filtered layer views move verbs and adverbs out of the ordinary vocabulary page into full-width transformation-tree pages. Declarative schema transform sets generate suffix-based state pathways from base-form cards without materializing every inflection.

## Mature sentence and transformation workflows

Sentence-transition cards now appear only in their dedicated filtered composer carousel, editing restores repeated punctuation in authored order, and transformation nodes update an inline generated-form preview. Schema validation also rejects ambiguous or ineffective punctuation and transformation declarations.

## Compact drawing pad spacing

Multi-character pads now trim unused horizontal space around each character’s stroke bounds and keep a small, consistent gap. The window narrows to the compact pattern while preserving character proportions, stroke order, timing, pressure, and pointer alignment during resizing and card changes.

## Drawing pad height fits content

The initial pad height now follows the rendered canvas, heading, and controls instead of a fixed allowance capped at seventy percent of the viewport. Short viewports reduce the available canvas height while preserving stroke proportions and keeping the Reset control visible. Loading another card refits the content and keeps the pad inside the viewport.

## Repeated drawing card selection

Selecting drawable Library cards while the pad is open now redraws every newly loaded pattern even when consecutive cards use the same canvas dimensions. Switching cards updates the guide immediately without requiring a resize or reopening the window.

## Drawing stays in the main page

Drawing Practice now stays inside the main page. Dragging and resizing use the main page’s scrollable content bounds, so the pad cannot cover the header or footer. In shorter windows the pad retains its natural drawing height and the main page scrolls vertically to reveal the remaining controls.

## Inline card links and readings

Inline card creation now commits staged pronunciation character selections before saving. Saving a reading already supplied by a lookup attaches its selected character links without adding a duplicate pronunciation. Lookup values immediately redraw using the pronunciation list’s newline format, and automatically composed vocabulary and sentence readings remain visible as the main input changes. Detail headings resolve reading groups by their complete reading rather than their field-list position, and can resolve unlinked readings to canonical writing-unit cards.

## Transformed and compound links

Transformed vocabulary headings and readings link to the canonical writing units of the displayed form. Used By also includes complete canonical spelling and pronunciation compositions, so compound kana links resolve upward even when stored references identify smaller units. Stored relationships remain visible; incomplete compositions do not create partial links.

## Immediate detail relationships

Detail relationship lists show immediate neighbors. Used By, Usage Examples, and the relationship tree exclude dependants reached through another spelling or pronunciation parent, including grouped references. Direct links remain available, and cyclic references do not cause repeated traversal. Similar Items continues to show same-layer peers.

## Preserve concurrent direct links

A direct relationship remains visible even when an intermediate route reaches the same card. Authored references, grouped references, and canonical title components retain their direct links, supporting both あ → ある + あるく and あ → ある → あるく. Only relationships reached exclusively through another parent are excluded.

## Transformed card readings and root

Transformed cards omit a pronunciation identical to their displayed title after normalization. Distinct readings retain their character links. A localized Return to {{ verb }} action restores the base card and clears the selected transformation while preserving normal card navigation.

## Dependency scopes and deletion

Dependency writes now enforce the visibility of every edge, including grouped references. Personal cards may use readable shared cards and their own private components; class cards require global or same-class components; global cards require global components. Update proposals validate their reference schema before submission, publication approvals recheck current dependencies, and edits cannot invalidate a pending publication. Moving shared content back to personal scope is blocked when shared dependants or pending requests still need its wider visibility. Permission hints are returned after creation and editing and respect class write access.

Deletion confirms all deletable cascade and restricted dependants, including grouped references, while detached cards remain. The transaction checks ownership, class access, protection, and pending review for every affected card before deleting anything. Restricted dependants reached by another cascade no longer fail due to traversal order. Shared creation offers a personal save when dependencies are too narrow. Publication assistance can request eligible leaf components, including hidden definitions, before submitting the parent after approval.

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

## Dictionary imports and drafts

Dictionary results can be reviewed before applying their pronunciations, classifications, tags, references, and separate sense definitions. Imported readings immediately use the same saved-value controls as manually committed readings. Generated readings update as the main input changes while preserving authored alternatives. Required tabs have one marker and the definition add action is compact.

The Retrieve missing translations action calls `POST /api/v1/study/library/definitions/localize` with `{ translations, languages }`. It requests missing UI languages through `localization:translateString`, preserves supplied translations, and reports `missingLanguages` when a provider is absent or fails. Missing translations remain editable; English is not copied into other language fields. This is also available when adding a definition manually.

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

## Direct relocation controls

Selected cards show “Relocate to:” followed by the available public, classroom, or private destination icons. Each icon directly starts its existing scope action; the classroom picker remains available when a class destination is chosen.

## Dictionary search and caching

Dictionary providers opt into navigation search with `searchable: true` and the `dictionary` capability. Search uses only supported layers that allow dictionary lookup; sentences remain excluded. Results open on the dedicated Search Results page, with card previews, full definitions, hidden source metadata, and the normal card composer for deliberate imports. Cognis persists results by provider, schema revision, and normalized query for 24 hours, coalesces concurrent queries, and retains the cache across restarts. Refresh explicitly retrieves the provider again. Fresh local cards and pronunciation links resolve against the current accessible Library rather than cached entry permissions. Provider enablement and schema changes control availability. Jisho has no incremental change feed, so new upstream entries are discovered by refresh or expiry, not by an unsupported delta query.

## Review and relocation

Administrators and owners relocate personal cards directly into authorized shared scopes; ordinary learners submit review requests. The full text-and-icon destination control is clickable. Requests show the submitted card, proposed edits, scope, author, dates, decision status, and compact authorized actions. Decision history remains visible, including withdrawals. Card changes and decisions run in one database transaction with conditional pending-status transitions. Failed validation rolls back the decision; stale or repeated decisions report an error. Submission snapshots preserve reviewed content and prevent approval after the source changes.

## Efficient dictionary resolution

Dictionary results render before reference hydration. Preview resolution requests only referenced entry IDs or provider record IDs and the atomic characters needed for pronunciations; the complete carousel library loads when opening a composer or navigating a linked card. Entry lists hydrate references in one batch rather than querying each card. Request lists map existing rows and avoid reading sources for unauthorized or completed requests. Hidden fields use the same visibility selector in search and review previews. Expired dictionary-cache rows are removed on cache writes using an expiry index. Approved relocations invoke the same registered move flow as direct relocations, inside the decision transaction.

Search also invokes the registered search flow on cache hits, so extension hooks apply consistently.

Study navigation requests only pending review items; the Requests page retains complete status history.

## Compact Study navigation

Dictionary search stays on one line with a compact search icon. Pending reviews use the navigation accent underline instead of a red outline.

## Stable dictionary searches

Jisho retrieves current lexical and Kanji data on host requests. Exact word/reading matches rank above related matches, kana-preferred entries keep their conventional Kana form, and Wikipedia-only title results are excluded. Missing readings never become definitions or invented pronunciations. The provider preserves definitions and source metadata separately; Cognis owns all cache policy.

Cognis core owns dictionary caching through `core:cache`. A cached query becomes cold after one hour; its next use probes the provider for changes. Changed results remain pending until the twelve-hour publication boundary, and unchanged results retain their content. Concurrent queries share one probe, and failed probes preserve the last successful result. Cache state survives restarts. Modules retrieve provider data without scheduling queries or maintaining provider-response caches. Jisho has no lightweight change feed, so a probe requires the ordinary search response. There is no manual Refresh control. Local pronunciation and card links always resolve against currently accessible content.

## Clear request review and relocation

My Requests is a read-only history of every submitted status. Pending is the sole review queue. Request headers show requester/reviewer profile avatars and links; decision time is available on the status pill. The card title, primary pronunciation and definition share an expandable summary, with related cards grouped by relationship. Visibility downgrades use the cancel button style. Mixed relocation directions or unchanged destinations disable the control until the conflicting selection is removed.

## Dictionary reading graphs

Dictionary source data remains invisible metadata in composers and detail views. Imported pronunciations use hidden Vocabulary readings with the same scope as their parent. Multi-reading Kanji uses one hidden record per reading, with a title link to its source Kanji and ordered Kana pronunciation links; single-reading Kanji links directly to Kana. Complete word readings compose from the nearest authored Kanji-reading segments and remaining Kana when available. Definitions are linked directly to hidden readings. Cognis resolves provider identities and commits the graph atomically through normal field, layer, dependency and ACL validation. Characters and particles remain provider-owned. Redundant Katakana echoes of an equivalent Hiragana reading are filtered unless the dictionary declares that Katakana spelling; authoritative Kanji on-readings and genuine loanword readings are preserved.

## Validated operation stages

Repeated dictionary imports reuse matching hidden reading cards instead of producing duplicate conflicts. Owner validation and persistence execute within their named ctx stages; edits have an update flow and rejected hooks roll back writes. Invalid lookup bodies receive safe validation codes; unexpected internal failures return generic server errors. Shared definition validation lives in component-local reuse. Core 0.3.109 adds optional per-invocation `handlers` to `FlowRunOptions`. Each owner handler runs before extension hooks in its registered stage, contributes its result to `stageResults`, and shares only that invocation’s `data`. Unknown stages reject before execution. A rejected stage stops later stages. Components keep persistence inside their own transaction so extension-hook failure rolls back writes; per-run handlers are not stored as global hooks.

Core 0.3.109 · Library 2.24.43 · Study 1.8.44

## Composer and relocation

Hovering a carousel card highlights every matching placement instead of showing position counters. Pointer dragging reorders individual placements without selecting text. Typed verb suggestions use the transformation chooser, whose wider two-column layout preserves readable cards. Committed definitions support unlinking with a trash control and retain dictionary sense order. Rebinding page interactions removes previous listeners, and batch deletion has one in-flight confirmation.

Shared-to-private relocation requires confirmation and an administrator review request, including requests submitted by administrators. Approval recomputes inaccessible dependents and deletes their cascades atomically with the move; compatible personal cards remain. Protected or provider-owned cards and pending dependent requests prevent approval. Ordinary deletion permissions remain unchanged. Successful requests show a toast; owners of removed cards receive notifications in the Study category. The move-to-personal endpoint now returns HTTP 201 with a pending request rather than a relocated card.

## Dictionary transformations

Transformation choices align titles, readings and definitions in a single column within each card. The base-form action uses the neutral button style. Dragging displays a vertical insertion marker before or after the destination placement. Jisho imports retain supported conjugation-family tags on vocabulary cards; newly created verbs enter the transformation chooser before being added to a parent composition. Adverbs retain their lexical classification; the current Japanese schema declares no adverb transform sets.

Dictionary providers may return prerequisites: an array of { key, layer, label } lookup targets. After a composer match is selected, Cognis resolves existing compound-writing cards at the intended scope or retrieves and creates missing cards with their definitions and reading graph. Atomic characters and particles cannot be created through this path. Alias keys resolve to canonical IDs in root and hidden-reading references. Vocabulary input remains unchanged, and imported spelling references are used only while the input still matches the lookup. Search result browsing never creates prerequisites.

Missing required fields are completed through registered auxiliary lookup providers before persistence; Kanji stroke patterns come from KanjiVG. Each Kanji, its definitions and hidden readings commit as one validated scoped graph.

## Keep Drawing Pad Placement

Loading another character into an open drawing pad preserves its current position, including placement chosen by dragging. The default position is applied only when opening a new pad.

## Card identity and import flows

Merge conflicts invoke the registered merge flow: administrators apply additions immediately, while learners request review for shared cards. Canonical input composition and scalar values remain intact; alternate readings, meanings, tags and eligible hidden reading graphs are added. Private dependencies cannot enter shared graphs, and failed merges keep the draft. Dictionary matches with identical composition combine readings and meanings; expanded spellings apply immediately when selected, while Continue or closing the chooser uses the exact composition. Imported reading chips resolve through hidden cards to individual Kana, and editing removes the old grouped links before replacement. Successful creation shows a toast. Carousels sharing a relationship preserve each other’s selections, including sentence connectors.

Filters reflect visible content in the selected layer. Relocation preserves entry identity and records `relocatedAt`; moved cards are excluded from new-content indicators and announcements, even after repeated private/shared moves. New global cards and new provider records retain their normal notifications. Request snapshots include original downstream context for card details and definitions; authorized history keeps that context after relocation, while a deleted source is reported as unavailable.

## Nested child card layout

Expanded children occupy the closest available positions around the active branch; dimmed background cards do not push them across the grid. Fitted ancestors remain stable while deeper children open. When a branch needs more vertical space, the grid reserves scrollable space and releases it on close. Resize and card-size changes trigger a fresh fit. Branch visibility is controlled consistently for pointer and keyboard focus, and long-pressing a child continues the current branch. Pending layout work is coalesced and cancelled when the branch closes.

## Explore Navigation

Learner layers appear in the Explore side menu at `/study/explore/<ISO language>/<navigationSlug>`. Modules declare the optional unique `navigationSlug` on each layer; its layer ID is used when omitted. Library and Requests keep their existing routes. Only sentence previews truncate long titles and definitions; other layers retain their rendering.

## Structured JSON Import

Use **Import** at the bottom-left of the Create Card type selector to upload JSON. Choose a writable scope; the entire batch goes into that scope. The supported envelope is `format: "cognis-library"`, `version: 1`, and a nonempty `entries` array.

Use another entry’s `key` as `entryId` in `references` or `referenceGroups`. Cognis allocates UUIDs before writing, substitutes those keys, and processes ready dependencies in layer batches. Existing 正規 Library IDs may also be referenced when visible in the destination scope. Missing targets, incompatible layers, cycles, invalid strokes, missing required fields, and duplicate content reject the whole transaction. The response returns created entries and the key-to-UUID `ids` map.

## Dictionary Import Limits

Cards support at most 8 tags, 16 pronunciations, and 10 definitions, together with field lengths and layer-specific cardinalities. JSON imports validate these limits rather than silently discard data. Dictionary imports prune surplus tags, pronunciations, and definitions before committing them; the composer blocks an eleventh definition.

## Flashcards Adapter

Enable the Study Flashcards adapter to build named decks from any readable Library layer or import Anki-compatible plain-text TSV notes. The adapter owns its routes, deck persistence, renderer, schedules, UI, and strings. Flip a card to reveal pronunciation and definitions, then grade Again, Good, or Easy. Again retries after one minute; Good starts at one day and doubles; Easy starts at four days and triples.

Decks are shareable resources of type `studyDeck` with the read capability `study:flashcards:read`. The standard Cognis Share control supports user recipients and public links, expiry, passwords, and revocation. Owners alone may edit or delete decks. User recipients can study and export; their review schedules are stored separately per account. A link guest studies in a temporary session without changing account schedules. Revocation and expiry are checked on every authenticated deck operation.

Import and export UTF-8, quoted tab-separated text with Front, Back, and optional Pronunciation columns. Exports include Anki separator, deck, and plain-text headers plus an optional Cognis context column; Anki can ignore that column. Embedded quotes, tabs, and newlines round-trip safely. This is TSV interchange, not an `.apkg` archive. Review history is private and is not exported.

## Drawing Controls

The drawing window close control uses the standard themed close SVGs. The guidance control is disabled while all stroke guides are visible. Loading another character preserves a user-positioned drawing window.

## Stable Background Layout

Detail popups preserve the existing document scroll container and scrollbar gutter, keeping sticky side menus in place. The drawing pad uses a separate floating boundary without changing the underlying page height or overflow.

## Study Browsing and Favourites

Flashcards opens a browse page containing owned decks, decks shared with the current account, and complete starter decks from enabled language providers. Bearer-link shares retain their existing access rules and are not a public directory. The widget’s top-right + menu offers Create Deck and Import Deck. Explore, Library, and Flashcards reuse account-persisted Study favourites and sorting controls (provider order, A–Z, Z–A, newest first, oldest first). An outlined star filters the current results to favourites and turns gold when enabled. Library items, decks, and individual study flashcards have independent favourite toggles. Favourites never grant access to content. The drawing pad releases its session on route changes, and its floating boundary no longer overrides composer or shell classes.

## Provider Starter Decks

A language descriptor may declare `starterDecks`: an array of `{ key, name, schemaId, sourceRecordIds }`. `key` is stable within the pack, `name` maps locale codes to deck names, and `sourceRecordIds` contains up to 500 distinct existing provider record keys in study order. Cognis resolves the keys from the global Library to canonical Library IDs. IDs remain stable across content revisions. Incomplete decks and disabled providers are omitted. Starter decks are read-only; learner schedules and favourites remain personal. Browsing resolves membership only, while opening a deck loads its card detail context.

## Dictionary Search Results

Dictionary searches open at `/study/library/search` without URL parameters. The owning gateway client saves the latest query, language and provider in account-scoped server preferences, retrieved through the authenticated session; another account cannot read that state. Multiple matches appear in a horizontally scrolling preview row. Selecting a preview updates the single detail view while preserving horizontal scroll. A single match opens directly in the detail view. Badge fields appear once as metadata, provider source data stays hidden, and creating a card uses the existing composer and dependency resolution. Dictionary cache expiry and refresh policy remain owned by Cognis core.

Successful deck creation and import dismiss the protected editor before navigating to the refreshed browse page, so saved changes do not trigger a discard prompt. Favourite-only Library results display selected child cards independently; restoring provider order restores their original nested placement.

## Review and lifecycle fixes

Library 2.26.0 exposes `deleteContentPack(root)` on the public provider capability. It removes provider records, dependent cards, pack receipts and assets in one deletion-flow transaction; failed audit hooks roll back the operation. Cascaded deletions use existing Study notifications. Schemas remain available for independent authored content, and uninstall does not blacklist content, so reinstall can restore the pack.

Study regressions live in their owning adapter or gateway. Shared reading extraction, complete-label segmentation, JSON responses and UI test fixtures remove duplication. Content ingestion and viewed-entry handling have focused modules; readable declaration spacing is checked without relaxing file-size limits. Sort selects use `theme-select`, and favourite controls use themed square icon-button dimensions.

## Deck gallery and favourites

Flashcards 1.2.0 browses all visible decks in responsive tiles with source labels, language, card totals and new/due counts. Deck search uses the existing Study search matcher; sorting and favourite filtering use the shared gateway controls and layout. Browse/detail markup lives in Flashcards-owned HTML templates. The gallery follows the clear title/metadata patterns of [Brainscape](https://www.brainscape.com/subjects) and [Knowt](https://knowt.com/explore).

Library preview stars sit beside selection controls, clear of child-card hover hints. Favourite changes show success toasts, and Escape clears multi-selection unless a popup already consumed the key. Deck detail shows the deck favourite; an active review session shows the current card favourite instead. The Export action appears only when `canExport` permits the creator or an administrator, including administrators viewing provider decks.

## Consolidated Deck Practice

Deck practice and shared snapshots use one linked-answer renderer and one imported-note conversion. The unused flip/grade renderer, styles and labels are removed. Library loading is shared within the deck page. Practice visibility, ctx stages, sharing and review permissions remain enforced. Multi-character drawing patterns retain provider-authored character boundaries.

## Shared Language Pages

Language selection opens Cognis-owned Explore pages even when content providers declare no child pages. Switching languages preserves the equivalent writing, vocabulary or sentence role; Flashcards, Library and Requests keep their shared page context. English declares alphabet, letter combinations, vocabulary and sentences using its opinionated slugs. Aborted favourites loads release their mount without misleading failure toasts.

## Optional word forms and reachable previews

A provider transformation set may declare `optInTag`, for example `plural`. A card must carry both the family’s `matchTags` and that opt-in tag before Cognis exposes or accepts its forms. The composer shows the provider-labelled switch for matching families; saved sentence references retain the base UUID and `{setId, path}`. Removing the opt-in prevents new transformed references. Providers define countability, irregular spellings and pronunciation changes; Cognis supplies selection, persistence and validation. Nested branches use the closest collision-free placement with an unobstructed path to their parent. Sentence previews truncate their title and clamp their definition without resizing the grid.

## Language galleries and two-sided practice

Deck galleries use `/study/<iso>/flashcards`; individual decks use `/study/<iso>/flashcards/<deck-id>`. Language selection opens the corresponding gallery and excludes other languages. New decks retain their language, including imported notes; library-backed decks infer it and reject conflicting language assignments. The front shows the question, with definitions and readings on the flipside. New cards can enter Reading or Writing immediately. A Previous card action keeps session answers without recording a second review; previously correct cards return as front previews and flip on request. Canonical Library links use themed boxes and the departure confirmation.

## Theme-aware pointer controls

The shared pointer-style button uses the standard theme foreground (`--text`) for mouse, laser and crosshair icons, including in embedded component pages. Participant pointer colours remain unchanged.

## Template based module standard

Require new modules to start from the module template. Define domain route, stylesheet, markup, test and release-note paths; synchronize contributor guidance and replace the outdated documentation standard with examples and complete current contracts.

## Scoped module resource lifecycle

Add owned browser provider mounts, catalog reconciliation and navbar contributions, plus disposable health and public keyring-data registrations. Failed bootstrap releases partial resources and routes. Messages supports distinct room creation and stable saved-room lookup without renaming or participant-based reassignment.

## Retrieve module artwork as raw bytes

Stream artwork separately from code installation, avoiding GitHub’s inline JSON size limit while preserving private authentication and bounded content-hash caching. Reject empty downloads, log retrieval and cache failures, retain unknown icons and display localized unavailable banner placeholders.

## Module identity diagnostics and browser provider ownership

An administrator installing a module with an ID already owned by another UUID receives a conflict containing `moduleId`, `installedModuleUuid` and `requestedModuleUuid`. The server and module lifecycle UI log these identities; non-administrators cannot access them. A matching ID and UUID remains a valid update. Do not change published UUIDs or overwrite a conflicting installation to bypass this check. Browser provider lifecycle ownership is shared through `ui:providerLifecycle`, so bundled and directly served loader instances reconcile one provider catalog and cannot mount the same provider twice.

## Exclusive integration source bindings

`social:messages:sourceBinding` provides `bind` and `release` with `{roomId, actorAccountId, sourceType, sourceId}`. Group resolution also accepts `source: {sourceType, sourceId}`. Authorized room members can claim an unbound room; another source receives `source_conflict` without overwriting it. Repeated claims by the same source are idempotent. Conditional updates arbitrate concurrent claims, and release only removes the matching source. Group resolution and binding operations execute registered ctx flows.

## Scoped browser actions and authoritative administration

Browser providers obtain `ui:scopedActions` from their scoped ctx. Calling it with `(ctx, moduleId, actions)` registers an executable flow for each named action and returns the published action functions. Use these functions for administration reads and mutations; the host owns flow disposal and stale handles reject after teardown. Backend administrator privileges come from the current enabled account role, rather than caller-supplied role fields.

## Unknown availability without lookup errors

Release 2.0.14 — GET availability returns a successful unknown status for a missing or privacy-restricted profile. Both cases have the same response shape and never query its manual preference or calendar status. Existing owner, block, community, friend and private visibility rules remain enforced; writes still require the owner. Avatar indicators display unknown without repeated not-found errors.

## Keep Study details usable

The floating drawing host stacks above the page action dock. Related-card sections wrap normally through five rows, then scroll horizontally with hidden scrollbars; resizing recalculates the threshold and popup disposal releases the observer. IPA pronunciation values keep their authored notation and use readable phonetic typography.

## Unify Study pronunciation presentation

Study provides public pronunciation classification and styles reused by Library previews, detail headings, variants, flashcard answers and reading choices, and the drawing pad. IPA keeps its authored notation; ordinary readings keep the selected app typography. Both Japanese and English sentence schemas require at least two word references.

## Preserve module IDs in locale keys

Locale keys use `module.<manifest.id>.<feature>.<label>`. Keep a multiword module ID intact with its hyphens; for `terms-of-service`, use `module.terms-of-service.admin.title`. The suffix after the module ID uses lowercase period-delimited words. Manifest metadata, XML bundles and code references must use the same namespace.

Marketplace presentation keeps cached names, descriptions, categories and tags with their catalog locale bundle when an installed module uses a different namespace. Installed preferences retain their own locale URL; a fresh catalog discovery replaces the cached presentation.

## Keep legal footer links available

All browser clients use the footer registry owned by `ctx`, including separately loaded static and bundled scripts. Footer descriptors may request `target: "_blank"`; the renderer adds `noopener noreferrer`. Authentication providers supply translated labels and authentication contexts, while signed-in legal links explicitly belong to the application context. History and browser-cache restoration refresh published legal links without replacing core License or Changelogs links.

## Restore native legal-link navigation

Internal links with new-tab targets, modified clicks, and downloads retain browser behavior. Returning with Back to a server-rendered route such as login loads that document, including its search and fragment, rather than leaving the previous SPA view visible.

## Require language keys without literal fallbacks

AI instructions prohibit hardcoded English user-facing strings in every path. Missing preferred-language values may use the same keys from English XML resources; absent or empty English fallback values must fail explicitly instead of rendering literal English, raw keys, or blank text. Missing-translation errors must not be suppressed.

## Centralize locale fallback in Core

Core’s shared `createI18n` and `extendI18n` resolve missing or empty preferred-locale values from English XML per key across core, module and component bundles. Unresolved keys throw `missing_translation:<key>`. Modules supply their bundle URLs and use the host resolver; they do not implement their own fallback policy.

## Use stable image failure events

Marketplace image retrieval logs use stable event identifiers with the existing structured failure fields.

## Refresh module assets independently

Core adds the installed module revision to module-owned UI asset URLs when registering contributions. Module scripts and locale files revalidate instead of inheriting the host release’s immutable cache lifetime. The service worker fetches module assets directly without cached fallback and rotates its asset caches. Updating a module changes its entry import identity, preventing stale scripts from requesting removed dependencies.

## Dictionary audio and host caching

When a requested pronunciation is not bundled, English Study retrieves the word from the English Dictionary API and downloads a matching MP3 from its pronunciation media endpoint. A preferred IPA reading must match; a different pronunciation is never substituted. Only HTTPS media on `api.dictionaryapi.dev` is accepted, redirects are rejected, lookup and download share one deadline, and both responses have streaming byte limits. Missing recordings remain explicit errors. No Google speech service is used.

Cognis owns the recording cache, not the module. After authorization, its private Files cache reuses successful recordings across cards and restarts. Concurrent playback requests share retrieval and persistence. Keys include provider identity, revision, language, role, label and readings; a changed reading or provider revision resolves independently. Failed requests or writes remain retryable. The module contacts the dictionary only on a cache miss when playback is requested.

## Paced composition and replacement

Seed recordings use the offline Kokoro multilingual neural model with the English `bf_emma` and Japanese `jf_alpha` voices. Clips are encoded at 128 kbps with a 200 ms lead-in, a 180 ms tail, bounded peak normalization and slower speech. Model attribution and Apache licensing are recorded in `data/audio/VOICE-LICENSE.txt`; the recording inventory records the voice and processing settings.

An audio field is optional on sentence cards. On first playback Cognis authorizes every constituent, selects only the first pronunciation group, applies selected transformations, and creates one continuous WAV with a quiet lead-in and deliberate word, comma and sentence pauses. The generated recording is cached privately; constituent bytes, reading changes, transformations and pacing affect its identity. It is generated on demand for new cards as well as existing cards. Uploading an audio file in the normal composer replaces generated playback immediately. Removing that explicit file restores automatic composition. Providers supply lexical clips; Cognis owns composition and cache policy.

## Reference inventory coverage

The Japanese reference catalog includes all 13,108 characters in the packaged official KANJIDIC2 snapshot. The English catalog includes all 135,969 Open English WordNet lexical entries (127,311 normalized keys). These are separate lazy dictionary providers, not 149,077 eagerly imported seed cards. Choose Reference Dictionary in Study search to import supported entries through the normal graph validation. Source records without meanings or usable readings remain unknown; no pronunciation, translation or stroke diagram is fabricated. This inventory is not all Unicode Han and is not a claim to enumerate every possible English word.

Japanese Kanji readings are ranked from common JMdict attestations and available frequency markers, including okurigana forms; grouped links and seed audio follow that exact order. Kanji playback always uses the first authored pronunciation. Existing English word cards have one authored IPA reading; reference entries preserve authoritative order within the preferred British variety before other varieties. Pronunciation frequency depends on context, and the sources do not provide a universal frequency rank for every reading.

## Preserve transformed sentence audio

Sentence composition requests the selected transformed label and primary reading, including chained paths. If a variant recording is unavailable, playback fails explicitly instead of traversing base-form pronunciation references. The same rule applies to direct variant playback and nested constituents.

## Conceal writing answers

The drawing heading initially shows a masked character and a standard click-to-reveal button. Loading a different character masks it again. Floating sessions expose their current card through the removable `study:drawing:observe` capability. The matching Library preview stays open, blurred and non-interactive until the pad changes character or closes; pronunciation and meaning remain available in the pad. Embedded Writing uses the same concealment and reports reveals as assisted attempts.

## Commits

- [8423f71c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8423f71cb9279bdbc927e39cdd94fcdeb651a91a)
- [608f38a5](https://github.com/Cognis-Labs-HQ/Cognis/commit/608f38a59532f0b294d7384576ca882f2d94a4ba)
- [3dbb7248](https://github.com/Cognis-Labs-HQ/Cognis/commit/3dbb72488ea7564c1d2eeaa33b3928f64e46563e)
- [88b9bdf1](https://github.com/Cognis-Labs-HQ/Cognis/commit/88b9bdf17d59edfc6726deacb42487d382ef8fca)
- [70bf58e8](https://github.com/Cognis-Labs-HQ/Cognis/commit/70bf58e8761b41b554d9710bd908c4e7b1717cee)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [7d00b6a7](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc)
- [0c9c4e37](https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e)
- [32ca0df4](https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae)
- [a66d0837](https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504)
- [800b1809](https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4)
- [ea81a944](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea81a944257040a042c1d0c0c9b2447768390221)
- [3b51abc1](https://github.com/Cognis-Labs-HQ/Cognis/commit/3b51abc17cc6ed3a75921bfa242d16c33aae2ce0)
- [2e2d0928](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e2d092813312978c2f69640389f6401ec0230f5)
- [cff7223c](https://github.com/Cognis-Labs-HQ/Cognis/commit/cff7223cd64c36372e64484c362ba9b1a1f4e2f7)
- [bbb6bb8b](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbb6bb8bd8e2d70a6ec571c2a69e58665a90ca04)
- [e1e564bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1e564bf66580e7a1e8eaf24080c646f686d982c)
- [584fb0b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/584fb0b46ebb77bd43e585b3b41a279a0e6e9bfa)
- [7d597603](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d597603b3b1faf6df9d5c7a98973362312236d9)
- [61002cd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/61002cd2578510ff6d823b8ebb454364e2c930cd)
- [e8dac803](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dac803472e1dfc8a5bb2acf3082da88dad8a05)
- [a6aa6fe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6aa6fe85403331903570c9cd20f115ea48576be)
- [1337d0a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/1337d0a332a5ccb2d1081816d55e453f90a0c0bc)
- [eda8cb2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/eda8cb2ab208b458f73e79f5b89fd6413ccbab77)
- [337b2351](https://github.com/Cognis-Labs-HQ/Cognis/commit/337b23512bb9fd25e0ffce0d94058e4dcc959e84)
- [67b413b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/67b413b535c0a8662cfe92c1170ccfc4742e6eae)
- [79cbfa05](https://github.com/Cognis-Labs-HQ/Cognis/commit/79cbfa05a5409f780bb42f4ea5ac7c0f8ec67f01)
- [e4daa661](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4daa661ee08b05a48ecba33182c490d4352e660)
- [274fc626](https://github.com/Cognis-Labs-HQ/Cognis/commit/274fc626dbea45d3c8d66c82b98f1a0ba87a8052)
- [024d7dfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/024d7dfe05f713f390d7b9fb00410591018c9bf6)
- [281d2ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/281d2ac4dca994692513c8069ad21fe9affebedc)
- [f5214c14](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5214c148cab6eac78e3f8ee8aed3847ffba2201)
- [bec24655](https://github.com/Cognis-Labs-HQ/Cognis/commit/bec24655948ca3a64ea6ab4f95f7897aecee68ac)
- [1501e390](https://github.com/Cognis-Labs-HQ/Cognis/commit/1501e390dce637fb660c5b540a4235e3e7c98f29)
- [48d14c1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/48d14c1ba63d887a04305306f8c9de7565361dfa)
- [87248429](https://github.com/Cognis-Labs-HQ/Cognis/commit/872484294f2d3b777c6123286db62c78dc08f7f8)
- [452e3eb3](https://github.com/Cognis-Labs-HQ/Cognis/commit/452e3eb3fc5b9e2ca86464904e7f6477992b7c32)
- [34fd7e7d](https://github.com/Cognis-Labs-HQ/Cognis/commit/34fd7e7d6ff01fa613a0c8d9aef006fcbb1c49d0)
- [dc044846](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc044846df3a4944e984ed27f7e87a2cd68ca5c3)
- [38b4662a](https://github.com/Cognis-Labs-HQ/Cognis/commit/38b4662a16a76798c6df10f0e8b489fdda17795b)
- [02761dc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/02761dc7e8cd2abc96bcf1b593ee78674b03b8ed)
- [e644ccb1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e644ccb16bcf5873ae95d373d84432b9a4bd2bbd)
- [efe439a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/efe439a8e4171e9e37d5040bb500b079e77a169e)
- [2f3df8bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f3df8bd0a160131db564451806303e24af77072)
- [ac5f84b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac5f84b55f918e7e6121eeedbb32d5dc383099c1)
- [c81f0310](https://github.com/Cognis-Labs-HQ/Cognis/commit/c81f0310c9966c5d4783b51bac6bbb52ff0fb5d5)
- [19956a20](https://github.com/Cognis-Labs-HQ/Cognis/commit/19956a2031ff88c897f18799d5a01ac688166bc9)
- [2b40ad02](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b40ad028ac75b37d161c075b04db41a85fdcaad)
- [c5d3f42d](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5d3f42d059d2aee21377f0f28d4ab2c2f026679)
- [8a9bf125](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a9bf125fa71a51cd45ac1e389d932c2bf1ca71e)
- [f3c01246](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3c012463c0a0a10018d8111a93cd61be82c8b00)
- [6aab168c](https://github.com/Cognis-Labs-HQ/Cognis/commit/6aab168c82f96e8991583d14d45e7f43f7c32efe)
- [caecf066](https://github.com/Cognis-Labs-HQ/Cognis/commit/caecf066d84d75cdf09fc337052e5df1d9393195)
- [618ba4f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/618ba4f547fbde0d4dc2a9145ef02aa9451b180b)
- [0bb340a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0bb340a8bce6ce96596bfbfe36647743b696574d)
- [884b73f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/884b73f2286cfd8922494c2fe65ac3b51833ea54)
- [370b8072](https://github.com/Cognis-Labs-HQ/Cognis/commit/370b8072cdf1426028d40cd35876a970639a8380)
- [2134b228](https://github.com/Cognis-Labs-HQ/Cognis/commit/2134b22899bec50afe497bb76cc8502e4f5e23ad)
- [e13f1ae7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e13f1ae7cb2aadf237fd68efb03ca6f99fbf1304)
- [f5c4a1b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5c4a1b0f7ca4e702c8acd009d456e6c259f45fa)
- [71214834](https://github.com/Cognis-Labs-HQ/Cognis/commit/71214834eda07dce6a66d5ab936af0619057035e)
- [102676cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/102676cc7129164be361c769878169ce4e416962)
- [1755abca](https://github.com/Cognis-Labs-HQ/Cognis/commit/1755abcae0467c199e1ff2206c205f5e84eb2739)
- [c44c924c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c44c924cd0856b818eca7b26a165c61af58e4de6)
- [129d45e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/129d45e0eee66ab1c691d850c93b8c5dacb363de)
- [6994d3de](https://github.com/Cognis-Labs-HQ/Cognis/commit/6994d3de2dbb35c0321566ccc75fdc9d0bc621ea)
- [835f7889](https://github.com/Cognis-Labs-HQ/Cognis/commit/835f7889aab52125ab607d1cbaca4a85340e9377)
- [6711b43b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6711b43b9e01071fb2870536ac31e40157fc7354)
- [7dba3a24](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dba3a243376b31550328461840e869787092e5e)
- [119e9b3d](https://github.com/Cognis-Labs-HQ/Cognis/commit/119e9b3d21706fc6a65b049650ee484222f916b0)
- [c9715ab3](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9715ab3d9b044e06a394e09fdda27ec5f60cf4d)
- [89434568](https://github.com/Cognis-Labs-HQ/Cognis/commit/89434568d0d5865a260e3f515c5236eec7f940bd)
- [7e4af45](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e4af451f4cd017081c54a3f11ff505d6e9c71c4)
- [beedf4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/beedf4ef2bd4bdb7d6f54d71de91b61ced50c4fa)
- [2bb66db](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bb66db7203c0e8dfdf66b847aa3e11081ff4c19)
- [a6d2410](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6d2410144a73edac345feab9b6eb6e6b78e56ee)
- [6136fcb](https://github.com/Cognis-Labs-HQ/Cognis/commit/6136fcbfec13cd57346e52a38d616782f0793960)
- [f8877c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8877c716570c9285fc7b2ce71791a27543053ba)
- [a8a115f](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8a115f78a213a793a5b2fd27ccdb9fdf1c422ee)
- [24b91f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/24b91f948aee0815c0dec942cfef6a606c78a1f0)
- [e461c37](https://github.com/Cognis-Labs-HQ/Cognis/commit/e461c37c4f4758e84300e8cab721eb92bb6a198d)
- [b32fcf7](https://github.com/Cognis-Labs-HQ/Cognis/commit/b32fcf7b6a21b08a61808f5f60d6c5c4e1be8df0)
- [c6a32c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6a32c6a68b10a562fa8368faedc8f95493d2018)
- [856cd80](https://github.com/Cognis-Labs-HQ/Cognis/commit/856cd809b37f3abe4026cea01f7ece234b1ced87)
- [27f78bc](https://github.com/Cognis-Labs-HQ/Cognis/commit/27f78bcb096f891fa3790c4bf89221d9b842ff84)
- [eea52d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/eea52d437b3b8084e4bab393cb7e5f249a5447e3)
- [ddf1772](https://github.com/Cognis-Labs-HQ/Cognis/commit/ddf17726e4ef3c73a44411aeb3e4356a384848aa)
- [6d34532b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d34532b8a1346e5e83e67c7734c0f5d69191c1d)
- [1fd0cba1](https://github.com/Cognis-Labs-HQ/Cognis/commit/1fd0cba13366c2105ab3b62f4a7211042e6b52f3)
- [b30e0ee8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b30e0ee83fddb7a9dafbe604d7f003567a8095b6)
- [55e98e0f](https://github.com/Cognis-Labs-HQ/Cognis/commit/55e98e0f174d600915fb7e35db3021db3f382328)
- [77013ffd](https://github.com/Cognis-Labs-HQ/Cognis/commit/77013ffdf80946228f3d5fe23d7149e274a195a2)
- [5ff1a103](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ff1a103f7ee78883212810a1e30c37eaa097248)
- [44b938d](https://github.com/Cognis-Labs-HQ/Cognis/commit/44b938d30d2f521dc8f5adde88183a2e9a8c4996)
- [7f68be4](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f68be420c3c82742dd16a2b8da5c6dfacc5459d)
- [e6bcfe3](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6bcfe3bf167bf6b4d1e8a9feca648e7f2b41d9e)
- [220457c](https://github.com/Cognis-Labs-HQ/Cognis/commit/220457c4c97295029577c3a1c481427bbb1b4657)
- [dd1f7a2](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1f7a270483a29c5bd0e74933611988baf4ea0c)
- [8c29d55](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c29d5554f99500b7fcbcbc954ea965461fb2ce4)
- [0833f95](https://github.com/Cognis-Labs-HQ/Cognis/commit/0833f953889f056079b252135debb298f3e56051)
- [e64f233](https://github.com/Cognis-Labs-HQ/Cognis/commit/e64f23384deed84e371fbabe3649cfdad30abf59)
- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
