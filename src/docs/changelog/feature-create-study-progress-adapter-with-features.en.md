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
