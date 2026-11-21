# Reliable language drops

**Feature Branch:** feature-language-dropzones

## Owned positions and cleanup

Language transfers and ordering share destination-aware native and touch/pen gestures. Interrupted or outside drops leave the draft unchanged, and rerendering clears stale gestures. Canonical language codes, English fallback and offline restrictions remain unchanged.

## Drafts stay explicit

Save and Discard retain ownership of persistence. Language selection remains separate from study-language enrollment. The existing language tutorial and documentation explain the handle and save workflow.

## Lifecycle-safe completion

The gesture helper stays within Settings. Eligibility errors clear capture and indicators before reporting failure. Capture release cannot apply a drop after cancellation, owner replacement, or changes to the source and destination rows.

## Commits

- [11a1483d602de961698d40e71a4294ae6aaed206](https://github.com/Cognis-Labs-HQ/Cognis/commit/11a1483d602de961698d40e71a4294ae6aaed206)
- [e1366a2c893e370f434822f4201581c296f20449](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1366a2c893e370f434822f4201581c296f20449)
