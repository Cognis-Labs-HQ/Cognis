# Reader Avatar Details

**Feature Branch:** feature-message-receipt-integration

## Canonical Reader Avatars

Profile 4.1.0 adds `tiny` (1.22rem, 0.5rem initials) and `compact` (1.65rem, 0.6rem initials) to `buildContent`. The immutable `contentSizes` list advertises all five supported names. These are graphical footprints, not pointer-target sizes. The caller owns separate accessible targets, spacing and any outer separator ring. Existing `small`, `medium`, `large` and `buildMarkup` options retain their meanings. Consumers requiring the new sizes must validate the advertised list and ship with matching Profile JavaScript and CSS. Messages 2.9.0 uses both sizes; release these assets together. Existing Profile tutorials retain their current avatar controls and sizes.

## Accessible Reader Panel

Select **Seen by** beside a sent message to see its readers and read times. The panel works with a tap, click or keyboard activation. Close or Escape returns to the current button; Escape dismisses an active profile preview first. Tab follows the normal page order. Hover or focus a reader avatar for the standard profile preview; select it to open that profile. Records without a profile handle show a named, unlinked avatar. Reader icons do not show availability. Small circles retain their visual size inside separate, nonoverlapping 44px targets; long lists wrap and the detail panel scrolls within the viewport.

## Commits

- [64ebb0f5ad05df2b9a1d2076f6342bfc533d7683](https://github.com/Cognis-Labs-HQ/Cognis/commit/64ebb0f5ad05df2b9a1d2076f6342bfc533d7683)
- [f867dd84140cc015e9fa0c940c1178ab86d788e6](https://github.com/Cognis-Labs-HQ/Cognis/commit/f867dd84140cc015e9fa0c940c1178ab86d788e6)
