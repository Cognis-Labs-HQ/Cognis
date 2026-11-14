# Open Selected Study Language

**Feature Branch:** feature-study-selected-entry

## Direct Explore Entry

Opening `/study` goes straight to Explore for the selected available language. Selection follows Study subnavigation: an intentionally selected registered language is retained even when it is not enrolled; otherwise the first available enrolled language is used. With no valid selection or enrollment, online users reach language setup. An unavailable catalog or Explore provider leads to the existing unavailable page. Offline metadata misses use the empty Study composer page.

## Owned Navigation And Guides

The `study:navigation:enter` flow has `resolve` and `navigate` stages. It consumes the shared Study navigation model and provider schemas, then calls `ui:navigate` with replacement history and the resolved language. Explicit content, deck, Library and other Study deep links keep their destinations. Pending resolutions are discarded on page replacement, cancellation or provider disposal; enrollment/provider changes trigger fresh resolution. Read denials propagate, router vetoes are respected, and no directory is rendered while waiting.

The former directory-only `modules` tutorial target is removed. External guide consumers must target the current navigation or their own content rather than that retired directory.

## Commits

- [3088b0d2c7b37b425e4fd0411de6a48ef7d9236c](https://github.com/Cognis-Labs-HQ/Cognis/commit/3088b0d2c7b37b425e4fd0411de6a48ef7d9236c)
