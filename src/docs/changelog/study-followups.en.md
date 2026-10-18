# Study Media Improvements

**Feature Branch:** study-followups

## Image Viewer Sizing

The shared image-preview provider loads its stylesheet before publishing controls. The image-only popup removes heading markup and fits landscape, portrait and panoramic originals inside the viewport without horizontal or vertical scrolling. Library detail previews retain their 20rem × 18rem limits; editor thumbnails remain 8rem × 6rem.

## Study Media

Card detail reference images form a horizontal strip with a hidden scrollbar. Audio playback publishes the current card title, layer, Cognis artist and app artwork to the system media center, with play/pause/stop and lifecycle cleanup. Packaged sentence files take priority over generated composition. Companion modules ship 34 Japanese and 45 English direct sentence recordings; 124 Japanese kana clips were regenerated with native text and the explicit designated voice.

## Audio Regeneration

Regenerating a global card updates only its audio field and search index. Required identity, schema, classification, ownership, custom media and grouped references remain intact. An optimistic timestamp check rejects a concurrent edit instead of overwriting it. The regenerated cached recording is used on subsequent playback.

## Pronunciation Remove Control

Committed pronunciation chips place their remove button beside the reading components with a separate gap, including right-to-left layouts. Short and long readings keep the X clear of their content.

## Drawing Pad Navigation

Opening the drawing pad from card details closes the detail popup after the pad opens successfully. The concealed pad heading still reveals on the first click. Clicking the revealed heading on Explore opens the card directly; other Study pages retain the confirmation before navigating to Explore.

## Visible Practice Mode and Themed Controls

The persistent Read/Write selector now reveals its floating slot on Flashcards. Mode changes retain the saved preference and session restart confirmation. Export and Study settings icons use the active control color, following the app’s light/dark theme and hover state regardless of the operating-system theme.

## Disabled Study Language Isolation

Study Library checks the live language capability before exposing retained schemas, cards, audio, images, packaged assets or review requests. Disabled languages disappear from browse results and direct reads fail; re-enabling restores access without deleting stored content. Runtime provider state remains separate from content persistence.

## Live Language Registry Lookup

Library availability resolves language contributions from the live system registry rather than the adapter-local capability store. Disabling one language keeps the other language’s schemas, cards and starter-deck dependencies accessible; re-enabling restores retained content. A public registry takes precedence over any stale local snapshot.

## Commits

- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
- [68f4cad](https://github.com/Cognis-Labs-HQ/Cognis/commit/68f4cad583d4ff3b9f0b14c9d083d04324f3cdf1)
- [316acf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/316acf324b61e0346a93e15f4c69f5421052a238)
- [d53cbaf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d53cbaf39759a0cc6bbf64a3f17fdcbd549398e7)
- [76d4cce](https://github.com/Cognis-Labs-HQ/Cognis/commit/76d4cce408ec01e05998d3a006900678f7068d8e)
- [ebf8d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebf8d696cba04da9959435855f51aa12cb43f7c0)
- [7808a8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7808a8ab8206210563535fd5bfd7580e2ba484fc)
- [3fbcc05](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fbcc05d9bb0cc0d4fce6644598a7bb299e045e0)
