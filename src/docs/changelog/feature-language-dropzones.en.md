# Reliable language drops

**Feature Branch:** feature-language-dropzones

## Owned positions and cleanup

Language transfers and ordering share destination-aware native and touch/pen gestures. Interrupted or outside drops leave the draft unchanged, and rerendering clears stale gestures. Canonical language codes, English fallback and offline restrictions remain unchanged.

## Drafts stay explicit

Save and Discard retain ownership of persistence. Language selection remains separate from study-language enrollment. The existing language tutorial and documentation explain the handle and save workflow.

## Lifecycle-safe completion

The gesture helper stays within Settings. Eligibility errors clear capture and indicators before reporting failure. Capture release cannot apply a drop after cancellation, owner replacement, or changes to the source and destination rows.

## Commits

- [30805140b757a0385e9e75b3e064bed04b372b87](https://github.com/Cognis-Labs-HQ/Cognis/commit/30805140b757a0385e9e75b3e064bed04b372b87)
- [e35f4a12200f5ea7a421698262bf3f209d34ecc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/e35f4a12200f5ea7a421698262bf3f209d34ecc8)
