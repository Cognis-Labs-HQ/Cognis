# Open Selected Study Language

**Feature Branch:** feature-study-selected-entry

## Direct Explore Entry

Opening `/study` goes straight to Explore for the selected available language. Selection follows Study subnavigation: an intentionally selected registered language is retained even when it is not enrolled; otherwise the first available enrolled language is used. With no valid selection or enrollment, online users reach language setup. An unavailable catalog or Explore provider leads to the existing unavailable page. Offline metadata misses use the empty Study composer page.

## Owned Navigation And Guides

The `study:navigation:enter` flow has `resolve` and `navigate` stages. It consumes the shared Study navigation model and provider schemas, then calls `ui:navigate` with replacement history and the resolved language. Explicit content, deck, Library and other Study deep links keep their destinations. Pending resolutions are discarded on page replacement, cancellation or provider disposal; enrollment/provider changes trigger fresh resolution. Read denials propagate, router vetoes are respected, and no directory is rendered while waiting.

The former directory-only `modules` tutorial target is removed. External guide consumers must target the current navigation or their own content rather than that retired directory.

## Commits

- [cc25a6568920324c31a1812c02e3790c7d12e791](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc25a6568920324c31a1812c02e3790c7d12e791)
- [2de2715bf0f046d950eed9f294e3dfd6f815f043](https://github.com/Cognis-Labs-HQ/Cognis/commit/2de2715bf0f046d950eed9f294e3dfd6f815f043)
- [bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488](https://github.com/Cognis-Labs-HQ/Cognis/commit/bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488)
- [aea21af67ac61ff988b27fd636091a77a5998c5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/aea21af67ac61ff988b27fd636091a77a5998c5c)
