# Open Selected Study Language

**Feature Branch:** feature-study-selected-entry

## Direct Explore Entry

Opening `/study` goes straight to Explore for the selected available language. Selection follows Study subnavigation: an intentionally selected registered language is retained even when it is not enrolled; otherwise the first available enrolled language is used. With no valid selection or enrollment, online users reach language setup. An unavailable catalog or Explore provider leads to the existing unavailable page. Offline metadata misses use the empty Study composer page.

## Owned Navigation And Guides

The `study:navigation:enter` flow has `resolve` and `navigate` stages. It consumes the shared Study navigation model and provider schemas, then calls `ui:navigate` with replacement history and the resolved language. Explicit content, deck, Library and other Study deep links keep their destinations. Pending resolutions are discarded on page replacement, cancellation or provider disposal; enrollment/provider changes trigger fresh resolution. Read denials propagate, router vetoes are respected, and no directory is rendered while waiting.

The former directory-only `modules` tutorial target is removed. External guide consumers must target the current navigation or their own content rather than that retired directory.

## Commits

- [901418a110ee91975861d2232a8a2d2bbb4c0b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/901418a110ee91975861d2232a8a2d2bbb4c0b20)
- [afdd5e7af532e18b2f2c39c77b4c477036b4ea5b](https://github.com/Cognis-Labs-HQ/Cognis/commit/afdd5e7af532e18b2f2c39c77b4c477036b4ea5b)
- [b45e83afb36dae5bd6049d41f24cecb88b3ce864](https://github.com/Cognis-Labs-HQ/Cognis/commit/b45e83afb36dae5bd6049d41f24cecb88b3ce864)
