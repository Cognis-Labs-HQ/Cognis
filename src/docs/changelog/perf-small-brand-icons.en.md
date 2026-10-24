# Smaller Brand Icons

**Feature Branch:** perf-small-brand-icons

## Resolution by Surface

Page favicons, dashboard widgets, authentication, error surfaces and shortcut icons use a 384px image. The page header uses a dedicated 512px-high image resized directly from the tightly bounded original artwork. Its original aspect ratio and alpha are preserved, with no installation-icon padding; the existing header CSS box remains unchanged. Normal and maskable 384px variants are deterministically resized from the corresponding 512px artwork using Lanczos resampling, preserving composition, aspect ratio and alpha. The original artwork and platform installation icons (192px/512px and 180px Apple touch) remain available.

## Startup Image Transfer

Service-worker installation prepares the 192px, 384px and 512px normal icons without fetching the oversized source artwork. The cache version advances so existing clients refresh their asset list. Route and worker-install tests verify image dimensions and the larger, quality-driven transfer budgets using injected authentication contracts, without creating persisted tokens. The worker also prepares the dedicated header image.

## Commits

- [eaa76ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
- [0d6fbe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0d6fbe8efa1621057a43e721b949beca339cdf82)
- [46d4b23](https://github.com/Cognis-Labs-HQ/Cognis/commit/46d4b23d3f2c77a30f35317bbad9dbe609ef0363)
