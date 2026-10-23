# Faster Provider Loading

**Feature Branch:** perf-production-provider-assets

## Resolve Production Bundles

The build includes literal host script references even when other entries import them. Registered gateway and adapter static directories resolve custom URL prefixes to their emitted bundles. API version advances to 0.6.22.

## Overlap Host Downloads

After authenticated discovery, immutable host bundles preload concurrently while provider imports and mounts retain their order. Links are cleaned on completion or failure; active providers are not fetched again. External, source and revision-qualified module URLs preserve their loading behavior.

## Preserve Runtime Boundaries

Regression coverage checks built module identity, authorization, enable and uninstall filtering, external resource paths, ordered mounts, cleanup and retry. Private responses and localization data are not given new caches.

## Commits
