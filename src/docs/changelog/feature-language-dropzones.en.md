# Reliable language drops

**Feature Branch:** feature-language-dropzones

## Owned positions and cleanup

Language transfers and ordering share destination-aware native and touch/pen gestures. Interrupted or outside drops leave the draft unchanged, and rerendering clears stale gestures. Canonical language codes, English fallback and offline restrictions remain unchanged.

## Drafts stay explicit

Save and Discard retain ownership of persistence. Language selection remains separate from study-language enrollment. The existing language tutorial and documentation explain the handle and save workflow.

## Lifecycle-safe completion

The gesture helper stays within Settings. Eligibility errors clear capture and indicators before reporting failure. Capture release cannot apply a drop after cancellation, owner replacement, or changes to the source and destination rows.

## Commits

- [d11dbdaca92963277b8afdb02e676a0cb6f02cbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/d11dbdaca92963277b8afdb02e676a0cb6f02cbc)
