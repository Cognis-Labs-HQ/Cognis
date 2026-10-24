# Persistent Navigation

**Feature Branch:** perf-persistent-navigation

## Persistent Navigation

Route loading covers the affected workspace while the retained header and navigation remain visible. Direct document loads retain the full-page loading surface. Superseded navigation releases its loading token immediately; pending content and runtime errors remain visible through their existing loading and error surfaces.

Each shell composition requests current preferences once for theme and language controls and schedules one avatar refresh after provider readiness. Unchanged avatar nodes remain mounted. Late avatar results are rejected after account, token, provider or refresh changes. No private-response cache is introduced.

## Commits

- [ab071e280a6109d8d617e006fba9f2fe80419548](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab071e280a6109d8d617e006fba9f2fe80419548)
