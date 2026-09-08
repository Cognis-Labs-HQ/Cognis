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
