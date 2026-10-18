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

## Commits

- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
- [68f4cad](https://github.com/Cognis-Labs-HQ/Cognis/commit/68f4cad583d4ff3b9f0b14c9d083d04324f3cdf1)
- [316acf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/316acf324b61e0346a93e15f4c69f5421052a238)
