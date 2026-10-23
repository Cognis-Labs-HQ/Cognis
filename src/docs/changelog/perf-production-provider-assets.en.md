# Faster Provider Loading

**Feature Branch:** perf-production-provider-assets

## Resolve Production Bundles

Only declared script URLs and direct navbar registrations are forced build entries; ordinary static imports remain bundled dependencies. The build includes literal host script references even when other entries import them. Registered gateway and adapter static directories resolve custom URL prefixes to their emitted bundles. API version advances to 0.6.22. Settings sections added by construction flows are resolved through the same manifest after authorization and visibility filtering. Each request uses the current descriptors; source-only and revision-qualified module resources keep their authoritative URLs.

## Overlap Host Downloads

Only catalogs required before page mounting opt into preloading. Navbar catalogs retain demand-driven downloads so background discovery does not fan out requests during navigation. After authenticated discovery, immutable host bundles preload concurrently while provider imports and mounts retain their order. Links are cleaned on completion or failure; active providers are not fetched again. External, source and revision-qualified module URLs preserve their loading behavior.

## Preserve Runtime Boundaries

Regression coverage checks built module identity, authorization, enable and uninstall filtering, external resource paths, ordered mounts, cleanup and retry. Private responses and localization data are not given new caches.

## Commits

- [9def8947fd3571bee5901acf901119e190d3f9d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/9def8947fd3571bee5901acf901119e190d3f9d1)
- [207a05e4670647f3ad530c99b40a54c19bec94a4](https://github.com/Cognis-Labs-HQ/Cognis/commit/207a05e4670647f3ad530c99b40a54c19bec94a4)
