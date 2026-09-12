# Learning Progress Events

**Feature Branch:** feature-create-study-progress-adapter-with-features

## Immutable progress tracking

Adds privacy-scoped, idempotent learning events, compensating corrections, rebuildable mastery projections, multidimensional aggregation, and a staged extension flow.

## Metadata filter groups work

Library metadata groups can now declare exclusive single-selection pills or allow multiple selections. Applying a pill immediately hides non-matching cards, including cards whose grid display styling previously overrode the `hidden` state.

## Authenticated themed audio

Library audio now loads through the authenticated Study gateway client instead of an unauthenticated native media request. Temporary media URLs are cleaned up after use, and native controls follow light and dark application themes.

## Library UI structure compliance

Moved the Library browser entry point to the required adapter `ui/app/index.js` layout and updated its runtime route and structural tests. Documentation scans now ignore generated build output, naming checks cover the moved source cleanly, and router tests reflect dynamic gateway routes and preserved navigation state.

## Repeatable content imports

Study Library content IDs are now stable across package versions, and each entry stores a canonical content hash. Import reconciles older version-derived IDs and repeated identical hashes into one canonical entry while preserving inbound and outbound references, preventing repeated alphabet or vocabulary cards. All-key references continue to use conflict-ignore inserts.

## Clear audio failures

Failed Library audio now replaces only its player with a localized message on the same themed surface instead of reporting that the entire Library failed. Dark-mode controls use the application accent and elevated surface colors.

## Directional character variants

Character and alternative-character relationships can declare a left, right, up, or down variant direction. The Library keeps each variant independent while unfolding child controls around the parent card on hover or keyboard focus.

## Owner-controlled Library deletion

Content owners, administrators, and owners can now select multiple Library entries and permanently delete them with their relationships. Module enablement restores missing supplied content by default, while an explicit deletion checkbox blacklists selected content hashes to prevent exact records from returning.

## Usable variants and selection

Directional variants now use the complete Library card presentation with slight transparency and a floating shadow. Their hover region remains connected to the parent so users can move to and open them. Multi-select checkboxes stay hidden until an eligible card is held, support dark mode, and the Library route once again loads the complete Study sub-navigation styling.

## Pronunciation placement

Writing-unit cards and detail titles now keep character pronunciations beside the character, while lexical and sentence pronunciations remain below their text. Meaningful single-character words can be declared module-side through a one-character lexical relationship, and character details surface the corresponding inbound words.

## Focused deep links and actions

Right-click selection now opens the existing floating action bar with Select All, Delete, and close controls; normal card clicks leave selection mode. Checkmarks are centered, dark audio controls suppress the native orange tint, and relationship clicks activate and highlight the destination category. Definition text now owns its deep link directly, while constituent boxes are limited to declared resolver relationships to remove duplicate and unrelated Katakana links.

## Stable filtering with variants

Metadata filters now process only base Library cards carrying serialized filter data. Floating directional variants no longer reach the filter parser with an undefined dataset value, eliminating the Library page runtime error.

## Neutral pronunciation and audio

Character pronunciations beside detail titles now use escaped secondary title text at a smaller size and normal weight. Dark audio surfaces explicitly reject forced-color substitutions and apply neutral styling to native browser media-control panels and controls.

## Theme-owned audio and reliable variants

The Library now renders its own accessible audio controls instead of relying on browser-native media chrome, preventing operating-system and forced-theme accent colors from leaking into the player. Hovered and keyboard-focused character cards are raised above adjacent grid cards so their directional child variants remain visible and interactive.

## Module-defined chart grids

Library layer schemas can now request a row size and position content by record ID, including explicit blank cells for conventional charts. Cards scale evenly to fill the requested row, and floating child cards now render at 95% opacity.

## Required metadata filters

Modules can mark metadata filter groups as required and choose a default tag. Required groups always retain a selection, while any group with only one rendered tag selects that tag automatically.

## Explicit character compositions

Alt-character and word details now group resolver-backed character links under their module-defined relationship labels and place composition operators between ordered characters. Definitions and pronunciation readings remain visually distinct from those spelling compositions.

## Deliberate variant expansion

Cards with children now show a long-press hint on hover and expand variants only after the hold threshold. Variant cards retain their green outline on hover, close when focus leaves the complete card group, and also appear in a dedicated section of the parent detail view.

## Visible child-card direction

Expanded child cards now have a green border and a green arrow showing their direction from the parent. Parent-to-child padding uses the same spacing token as the normal card grid.

## Three-position variant contract

Variant relationships now explicitly declare `variant: true`; directions are limited to left, top, and right. When omitted, the Library selects the first unoccupied position. Direction arrows ship as distinct light- and dark-theme assets, and the obsolete in-tree Japanese adapter version entry was removed.

## Swapped card gestures

Right-click now enters multi-select, while holding a parent card through the long-press threshold fades in and holds its children open. Child cards are fully opaque with the same green outline at rest and on hover, and clearing the last selection exits multi-select automatically.

## Structured, deduplicated Library presentation

The Library now uses localized layer names, renders only declared non-empty fields, and no longer repeats variants in detail views. Definition-backed layers enforce localized meaning references, while language modules can supply composed sentence meanings and particle effects through the detail flow. Grids also accept numeric display IDs and explicit blank slots.

## Definitions remain embedded

Definition records can no longer be opened directly and only supply text to other cards. The UI displays localized content only in the active interface language. New presentation roles distinguish compositions, alternate spellings, and pronunciations, while definition-backed previews now receive the referenced definition records.

## Composition link in the heading

When a single composition link carries the same text as the current card, that link now replaces the popup heading and the duplicate Composition section is omitted.

## Overflow-safe Library width

The containing widget now sizes itself to the Library schema while remaining capped to the available space, eliminating unused right-side width and horizontal page overflow.

## Protected core page-shell contracts

Defined an exhaustive, machine-readable set of protected page-shell, composer, navigation, widget, and popup classes. Component CSS and scripts can no longer override or traverse those internals; existing violations now use explicit core composer options, popup APIs, and declared layout variables.

## Restore Library language-code parsing

Restored the explicit language parser dependency in the extracted Library presentation module, preventing the Library route from failing while resolving localized labels and definitions.

## Protect reusable UI contracts

Extended UI ownership enforcement to every class emitted by reusable core styles. A complete manifest and architecture check now prevent adapters, gateways, and modules from overriding reusable controls, while prior overrides were moved to component-owned selectors or the generic reusable implementation.

## Block unsafe external-module activation

External module enablement now performs a host-owned boundary scan before module tests run. It rejects direct Cognis-internal imports and URLs plus CSS overrides of every protected core or reusable class, while allowing integrations made through the scoped `ctx` capabilities.

## Restore the user dropdown after page navigation

The retained dashboard shell is now translated as a whole after client-side navigation, so every user-menu action remains labelled on Study and all other dashboard pages.

## Use the full Library page width

The Library card now fills its page-composer allocation, and layout editing is disabled so saved customization cannot shrink or reposition this fixed application surface.

## Keep the user menu in the page shell

The user dropdown now has a dedicated core page-shell stylesheet, and the dashboard layout explicitly keeps the core shell bundle loaded across direct loads and SPA navigation.

## Allow the user menu past the navigation border

The sticky page-shell header no longer clips overflowing content, allowing the user dropdown to render below the primary navigation border while retaining its shell-level stacking order.

## Align Shares and Logout menu actions

Asynchronous user-menu contributions such as Shares now receive the shell-owned menu classes automatically. Logout uses the cancel-action hover treatment and a theme-aware power icon.

## Refine themed action feedback

Logout now spaces its power icon from the label and tints the icon with the cancel-action red on hover. Study page links use the lighter success treatment in light mode instead of the saturated dark-theme green.

## Stabilize Library card interactions and typography

Revealed child cards now mask cards beneath the pointer, detail headings are fifty percent larger, and selection actions have consistent spacing. Library detail composition now receives variant placement correctly, fixing detail popups for referenced records from current language-module packs. The application font preference is now the root baseline, and fixed pixel/point text sizes were converted to relative units so custom text proportions scale with it.

## Keep revealed child cards visually isolated

Child-card hover and keyboard-focus rules now have enough specificity to override the shared neutral-button hover treatment. Revealed variants retain their stable surface and position, preventing the adjacent card underneath from becoming visible through the child.

## Isolate revealed variants from adjacent cards

While a parent card's children are open, the card grid now places a non-interactive blur and tint layer above adjacent cards but below the active parent and its children. This prevents translucent child surfaces from visually combining with neighboring card content.

## Minimal layer presentation

Library schemas can opt individual layers into compact cards that show only the entry's primary content. Clicking, right-click selection, long-press variant disclosure, and revealed child cards continue to use the existing interaction model.

## Preference-relative popup typography

Detail popups now establish their typography from the user-selected application font size, with proportional heading levels instead of an oversized fixed Library heading. External modules using absolute CSS font sizes fail boundary validation before activation.

## Remove phantom Library overflow

Hidden directional variant cards no longer participate in scrollable overflow. They are removed from layout until deliberately revealed, eliminating the empty card-width region and horizontal scrollbar while retaining long-press and deep-link disclosure.

## Consistent Library controls and validated sentences

Logout now retains only its red cancel hover treatment. Minimal cards keep pronunciation and localized definition context beside the primary value, while detail titles and audio failures use corrected relative sizing. Content-pack ingestion rejects ordered sentences containing text that is not backed by linked lexical-unit or particle entries.

## Redirect unavailable Study routes

Study SPA routes are now advertised only while at least one valid, enabled language module exists. Direct requests and cached SPA mounts redirect to `/error?code=503` when language validation leaves Study unavailable, rather than rendering an empty or broken Study shell.

## Content-sized minimal cards and stronger popup titles

Minimal Library grids continue to allocate the module-requested number of equal columns, including blank positions, while visible cards now shrink to their content plus padding and stay centered within each scaled grid slot. Popup titles are doubled in size and title details are thirty percent larger.

## Unified Library card details

Every Library layer now presents definitions through the shared popup title-detail structure, places scope beside the title, uses standard close controls and SVG navigation icons, and previews linked definitions consistently. Directional variants at grid edges fall back upward instead of overlapping the next or previous row.

## Complete compositions and stable Study navigation

Library composition references now merge by presentation role and preserve their declared positions, so particles remain in the same complete composition instead of appearing beneath a duplicate heading. Study sub-navigation folding now uses a header-height-aware hysteresis threshold that prevents layout-induced scroll changes from rapidly reopening and closing the primary navigation.

## Intra-layer Library references

Library schemas and content packs can explicitly link one entry to another entry in the same layer. These links now default to composition presentation, while directional variants and relationships explicitly marked as alternate spellings retain alternate-spelling behavior.

## Balanced minimal Library grids

Minimal Library grids now constrain their overall chart width from the requested row size and scale card height, padding, and primary text proportionally. Explicit blank positions render as hidden, dimensioned grid cells so subsequent kana remain in their requested columns.

## Larger minimal content with separated pronunciations

Minimal Library cards now render their primary content at twice the previous scale. Pronunciations occupy a dedicated line beneath that enlarged content, while localized definitions remain separate supporting text.

## Full-width minimal charts

Minimal Library charts now use the full available width with gapless, equal cells that preserve a two-to-one aspect ratio. Cards grow with their cells, rows use continuous separators, and requested blank positions display muted dashes instead of disappearing.

## Single-line adaptive popup headings

Popup title details now render as sibling h4 elements instead of being nested inside the h2 title. The shared popup measures the complete heading after rendering, reduces title-detail text as far as fifty percent first, then reduces the main title by at most thirty percent, and repeats fitting after font loading and window resizing so the row never wraps.

## Nested Library child cards

Child relationships are now direction-neutral. The Library assigns safe positions from the available space, displays child cards on an opaque raised surface without blurring their content, and recursively reveals nested child chains up to four levels deep.

## Natural Library scrolling

Library content now participates in natural document scrolling instead of using a nested content viewport. Clicking a card outside an expanded child-card tree closes that child view before continuing the card action.

## Progressive child-tree expansion

Hovering an already revealed child card now exposes that child’s own descendants through the same directional card mechanism. Nested trees can be explored progressively through all four supported levels without opening every branch at once.

## Safer card and popup exploration

An expanded child tree now consumes the first click on its parent or an adjacent card so the tree closes without unexpectedly opening details. Card previews combine multiple definitions and ellipsize under width pressure while detail popups retain every definition. Popup title details are larger, and titles for composed entries render their ordered components as individual deep links.

## Clearer compositional title links

Deep-linked items inside popup titles no longer use underline decoration. Their hover and keyboard-focus states now use a stronger accent border, tinted background, and focus halo so each clickable title component is visibly distinct.

## Consistent Library links and remembered Study destinations

Relationship links now consistently continue directly into the linked entry detail, including inverse “used by” links. Language switches reuse the last child Study page instead of falling back to the multi-language hub, and the language-settings view clears the active language-button state.

## Stable child reveals and hidden entries

Long-press release no longer collapses child cards before they can be reached, and popup opening is serialized to prevent duplicate dialogs. Content entries may now be hidden from direct browsing while remaining available to references and detail links; hiding a parent also hides its descendants. Child detail headings identify their parent entry.

## Eight-direction child-card slots

Revealed Library child cards can now occupy every cardinal and diagonal slot around their parent. Grid-edge-aware placement avoids sending children beyond the visible content when another slot is available, while added browser spacing and visible minimal-grid overflow keep card borders clear of surrounding edges.

## Reliable child-card placement

Library mounting no longer passes an absent parent direction into grid-edge placement. Root child cards begin with the supported direction list, and the placement guard now rejects non-string direction values safely.

## Bounded child-card trees

Child placement now prioritizes up, down, left, and right before diagonal slots. The first level reserves enough grid clearance for its deepest branch when possible, descendants track their cumulative position to stay within the Library widget, and opening one card tree closes every previously pinned tree.

## Persistent focused child branches

Hovering into a nested child now locks the complete ancestor path open while exposing that child’s next level. Sibling branches are temporarily hidden to reclaim space, and returning to another branch updates the focused path without collapsing the tree across card gaps.

## Stable reversible child focus

Focused child cards now receive an animated outline with a reduced-motion alternative. Moving back to an ancestor restores that level’s previously hidden choices, while leaving the complete parent tree removes all branch state and hides every child again.

## Opaque Library cards

Every Library card now uses an explicitly opaque light or dark surface, including compact grid cards, revealed child cards, and hover, focus, and active states. Underlying grid labels can no longer bleed through overlapping cards.

## Nested branch pruning and quiet hints

Focused-branch pruning now has enough selector priority to override every nested hover disclosure, so alternate children really disappear at each depth. Long-press hints are suppressed across the grid whenever a child tree is open, preventing messages from adjacent cards appearing beneath the active branch.

## Deep-linked parent in popup context

The parent character inside a child popup’s “From” context is now an actionable deep link. Popup secondary headings accept escaped action fragments, letting users open the parent directly without turning surrounding context text into a link.

## Smaller popup headings

The reusable popup title baseline is reduced by 25 percent, giving long confirmation and detail headings substantially more room before adaptive scaling or ellipsis is needed while preserving the user-configured typography scale.

## Reliable empty, relationship, and deletion states

The Library now shows a single empty-state message, ignores self-referential variant links, and transitively removes entries that depend on deleted content. The deletion warning lists every affected entry in a bounded, scrollable panel before confirmation.

## Correct child identity detection

Variant rendering now compares stable source-record identity as well as database IDs. Duplicate representations of the same logical card are no longer rendered as parent and child, while genuine child variants remain available.

## Stable detail popups and consolidated Library cards

Detail popups now reserve scrollbar space while locking the page, preventing the Library beneath them from changing width when dialogs open or close. Library layers also consolidate duplicate cards when normalized labels and their complete definition relationships match, while preserving genuine synonyms and many-to-many meanings.

## Durable progress and safer modules

Progress events and projections now persist through the DB gateway, reject conflicting event IDs, validate correction scope and time windows, expose a correction route, and conceal internal route failures. Restored external modules receive the same activation validation as newly enabled modules, symlinked sources cannot bypass boundary scans, content-pack imports replace obsolete references, and cascaded Library deletions update the browser immediately.

## Actionable module validation

External modules may now use only their own `/api/v1/modules/<id>` namespace without false-positive boundary failures, while cross-module and Cognis-internal URLs remain blocked. Missing disabled configuration routes return `module_config_unavailable` instead of falling through to 404. Validation of Nextcloud Whiteboard now identifies only its genuine incompatible core import and protected-class override; the module must publish a compliant update before it can be enabled safely.

## Configuration before activation

Disabled modules now load their declared API entrypoint through a server-only restricted context after API-source boundary validation. Only routes explicitly marked for disabled operation are mounted, allowing Jitsi Meet and Nextcloud Whiteboard configuration to be completed before enablement without activating feature routes, UI contributions, flows, or capabilities. The activation UI also treats an unavailable disabled configuration contract as a pre-enable fallback instead of creating a circular failure.

## Cascade-only deletion warnings

Library deletion confirmation now keeps directly selected entries out of the cascade warning. The warning and affected-content list appear only when additional related entries will be deleted transitively, while permanent restoration controls remain available for the selected content.

## No self-referential variants

Library variant placement now compares complete stable card content as well as database and source-record IDs, rejects missing parents, and filters duplicate representations again while rendering. Freshly rebuilt libraries therefore no longer show a card as its own child, while genuinely different variants retain their directional placement.

## Ignore stale grid record IDs

Library grids now reserve blank cards only for explicit schema placeholders. Static grid IDs whose records were deleted are omitted instead of becoming anonymous cards, so metadata filters such as Katakana no longer leave blank Hiragana positions visible.

## Remove self-references from usage details

Library entry traces now omit relationships whose source resolves to the entry itself and collapse repeated dependants by entry ID. Detail popups therefore show only distinct external records under Used By.

## Deep-link every composite spelling

Library word details now resolve complete spellings into canonical atomic and compound writing-unit entries when explicit composition references are absent. Headings such as 好き link 好 to its alternate character and き to its character, while secondary pronunciations such as すき receive the same complete composition links without presenting partially resolved text as authoritative.

## Complete Study Progress data coverage

Progress queries now resolve compensating events against the complete authorized history before applying aggregation or projection filters, and broad reads omit classroom events after access is revoked. Coverage now verifies every event field, projection metric, aggregation dimension, granular route, immutable correction window, persistence behavior, and adapter disablement contract.

## Complete namespace quota administration

The Files gateway now contributes an Administration section for editing the global default and every registered namespace's default quota through its owning UI client. The section is fully localized, gateway-owned, and covered by request and registration tests. The completed repository TODO file has been removed.

## Restore a clean full test and lint run

The remaining TODO aliases were removed, documentation tests now treat TODO documents as optional, and missing reusable profile-menu layout contracts were restored. Oversized Library and popup modules were split into focused filter and configuration-form modules, bringing both below the source-size guardrail while preserving their public APIs. All 1,999 repository tests and the full lint pipeline now pass.

## Respect Library Relationship Deletion Policies

Library deletion planning now follows each schema relationship's `restrict`, `detach`, or `cascade` policy instead of treating every incoming reference as a cascade.

## Keep Progress Persistence Inside Its Flow

The Progress adapter now performs durable event persistence and projection rebuilding in the advertised `persist` and `project` stages, so later extensions observe committed state.

## Close Module Validation Gaps

Boundary validation now detects static CommonJS `require()` calls and scans the complete module before a disabled API entrypoint is loaded.

## Keep Study Language Navigation Canonical

Remembered Study destinations are reused only when the target language actually registers that page; otherwise navigation uses the target language's declared default.

## Evaluate New Core UI Infrastructure for Protection

AI contribution instructions now require explicit protection evaluation whenever core UI functions, rendered objects, components, or classes are created or expanded.

## Restore Library localized labels

The Study Library browser now imports its localized-label resolver directly, preventing the Library route from failing while rendering schema and layer tabs.

## Restore Library metadata helpers

The Study Library browser now imports both metadata helper functions used to construct filter values. A source-level unresolved-identifier audit also confirmed that no other presentation references were lost during the earlier module split.

## Stabilize Study refresh and clarify Library details

Direct refreshes of `/study` now delegate safely from the child loader to the Study hub. Library variant dependants are presented as alternate spellings rather than generic “Used By” entries, and `localizedText` fields render only the active interface-language value.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
- [17756b2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/17756b2fb83d82f25bf7c349f63170fc738db995)
- [86d3162c](https://github.com/Cognis-Labs-HQ/Cognis/commit/86d3162c19544032fa2ccc6d55f80de58f9495fb)
- [77611b4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/77611b4ed1c6d7afa1221f966cf80ec9b1292316)
- [4ff6b5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ff6b5ec7825a19626c371347c04c43785971216)
- [1190320b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1190320be506d0c74feefa441a4188d05d3892ae)
- [5bb5607e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bb5607ec3cd60ff7ff2d1329dd66cb4cfc907a8)
- [83297da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/83297da5d62dcbaa8166af88531432b8468d721e)
- [164297bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/164297bda76fa834f5a0e988260c7b2580ef4b87)
- [31da2e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/31da2e2fcd3284f1c2edd0da12a22c416c374b88)
- [13754134](https://github.com/Cognis-Labs-HQ/Cognis/commit/13754134d1595372336cea85a1d1f85bb4da2a9c)
- [f4ad7320](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4ad732066d653312f37bba8a08c61d7d37d3522)
- [753a02dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/753a02dc9171670c41d02b9665e076422f3fc3b6)
- [82bb97c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/82bb97c02aac759f995373a1e9c1234d69b61d57)
- [44617c98](https://github.com/Cognis-Labs-HQ/Cognis/commit/44617c980ed07d896925f99bd27dd0ca57d2d831)
- [95b3065d](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b3065d2b20baf702b1b7ffb669cdd5351caf70)
- [f1ad82df](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1ad82df827fe30850bf4516aa790304a985d925)
- [893aece3](https://github.com/Cognis-Labs-HQ/Cognis/commit/893aece39d60e4bd4c84f7a809c504811f630d13)
- [7387683a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7387683a1faa0f8efd9d27a524f75b43eb81dbd4)
- [7f34d0c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f34d0c98a4b693a14f5c864bed07ace40bf79da)
- [c3a7f703](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3a7f703c729ca3490a6bc16ad01ae7eebe02674)
- [84a349c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/84a349c7fc4c1efb389ffd09b2ddd6654c2ecaba)
- [08110121](https://github.com/Cognis-Labs-HQ/Cognis/commit/08110121dca4e9ec80cf8d358c71e1b01212c2de)
- [7f0e9fdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f0e9fdb)
- [da4188fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/da4188fe99113db1a13c31e22d0703327fc7f540)
- [abfaddbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/abfaddbf0bafef8e9e08812cebdba2ee4557fbaf)
- [7f007d44](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f007d4430f88b1ae7d37fb3daf346adc5f2c9b3)
- [8ce047ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ce047ac3710628db7b52b16bc0169ab7fadd583)
- [8373c151](https://github.com/Cognis-Labs-HQ/Cognis/commit/8373c15186eb49298e4d961f11d273d06b3146ef)
- [a2da40bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2da40bf07e7651088e6444259aa536755c14b8a)
- [1d47e019](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d47e019124ef7e2e90c05f96a46ff0d3282912e)
- [e4fa5f2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4fa5f2ac0669a6ec93fe00b2a926283b2ac8ab4)
- [b1e6e962](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1e6e96288911f324cc48952431887ce89246ae1)
- [8a67d78e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a67d78e78cf9a52a989ebc56fb01b8f90b49193)
- [8a4b37c5](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a4b37c5220db3e29036ba17d768910f7eb118cf)
- [e4db7639](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4db7639cb19c88fef26ebd55f23eb6e6095ab17)
- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
- [c2b80b54](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2b80b5468ee6acfcb2e525fcdbcfd6df7865f5d)
- [d07ce255](https://github.com/Cognis-Labs-HQ/Cognis/commit/d07ce255cc0f65d5402f264a21574155c11c853d)
- [92da28e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/92da28e2f01c823c14ca435c44d3f47cfebede9e)
- [0e6be2ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/0e6be2ce8afb587a41cfc189aac8b4c4a6016a48)
- [be55dd47](https://github.com/Cognis-Labs-HQ/Cognis/commit/be55dd4775bda31fb70926e64af09fb322fdd50d)
- [fc3379e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc3379e48419678433fd00b250ff6bf45bf9a578)
- [e4b572ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4b572ee)
- [764c109d](https://github.com/Cognis-Labs-HQ/Cognis/commit/764c109dfa6530c33bddf8d8deaafff2e2ea7f48)
- [5ab1b885](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ab1b8853aaf5253230f4ab535e5c68fd6ccc0aa)
- [fff72d38](https://github.com/Cognis-Labs-HQ/Cognis/commit/fff72d38bc86a30fa95db9323f05494a747b43ea)
- [26a42897](https://github.com/Cognis-Labs-HQ/Cognis/commit/26a428979ae39d94ffd502733fee6ad2306a618f)
- [9d118560](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d118560c653e18847ed65945ddf363928cac172)
- [8c21c0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c21c0d2380f55b3b7d5c235c8f894080ea7f0fa)
- [16f02b7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/16f02b7bf334a42884dc78ffc46ff7baec857722)
- [1490dd84](https://github.com/Cognis-Labs-HQ/Cognis/commit/1490dd848112eab3f7aa82465c5c5c297818b719)
- [4c928d09](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c928d092a3a5dbc3589ea1dab0fbfc89bd35403)
- [d1ce3c69](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1ce3c69bb04c5b061943a8e909350284d31e45d)
- [20a8c29d](https://github.com/Cognis-Labs-HQ/Cognis/commit/20a8c29d58e56c750f03f001d9aa050927135bfb)
- [1463edb3](https://github.com/Cognis-Labs-HQ/Cognis/commit/1463edb37a5708a75c1a4ce022f69b18813752ad)
- [26c14c1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/26c14c1b63891f1a3115d3c69a17ae76e6f126d9)
- [e6746196](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6746196dcf3aa7f1a4ae12acaf8b65db5e438f5)
- [b1c8e514](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1c8e514d07ea1960ad3f47f83ff9fc0c4521a44)
- [5d0451d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5d0451d4b3c387625ae0f37732e5ea50124ec006)
- [93a3523a](https://github.com/Cognis-Labs-HQ/Cognis/commit/93a3523ad4226f15e9c768ffcee066d21ccf8dd8)
- [bbc45581](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc45581586a7979012bc1934ab75bd7d9f5b2ad)
- [9ad5f1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ad5f1b7b3d715d58a01e00d1e5317f8b04c5df)
- [d469f73](https://github.com/Cognis-Labs-HQ/Cognis/commit/d469f7323cb49ca8670fd22ca026bc830f9a38cf)
- [df9e46be](https://github.com/Cognis-Labs-HQ/Cognis/commit/df9e46be6f840f6fe00298e62dc179e7d5d83e06)
- [0db0f1b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/0db0f1b1771af5af2f36fe618269280dfbeab96c)
- [e95559ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/e95559ce6df3718d0f231f5ed8563d74b17b7b03)
- [2b3d8bdd](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b3d8bdd2d0016aacb221e26f21b79a347d2a57c)
- [fbd2c62e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbd2c62eac84d9ab568b8be7594e9ba590e68d48)
- [2b62938c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b62938cd6e77515e161240f8de4e15b273177fd)
- [90ff0ae1](https://github.com/Cognis-Labs-HQ/Cognis/commit/90ff0ae13fb1b81ed003dc4fae6ba56e63194610)
- [a7513e45](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7513e45b56ebbc8872f1798f7da4ce9e3f9b739)
- [d3d4ff25](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d4ff25aa3b11883df67844b0204ac62d211f00)
- [3dadb7fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/3dadb7fdb2f6269d735e6b8f7d0cdf8991ac5808)
- [695e05e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/695e05e157a4fcf279b71f22ba98dec8420f85e1)
- [4c057009](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c05700902ed81591fedc4e86e5bdd886eabd334)
- [770ca249](https://github.com/Cognis-Labs-HQ/Cognis/commit/770ca249d79ddba91f450f82c916fccd923107dd)
