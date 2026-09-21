# Library and Safety Fixes

**Feature Branch:** work

## Focused Library UI modules

The Study Library browser entry point is now a small page coordinator. Card rendering, layered grids, detail popups, selection, browser interactions, and variant interactions live in focused modules of approximately 100–200 lines while preserving the existing UI behavior.

## Atomic progress corrections

Ordinary progress events can no longer inject compensation identifiers. Corrections use the dedicated operation, and the persistent event store atomically guarantees that each target has at most one correction.

## Authorized Library deletion

Library deletion now resolves the final cascade and authorizes every affected entry inside the deletion transaction, closing the race between authorization and relationship changes.

## Stronger module boundaries

External module validation rejects source symlinks, directory symlinks (including dotted names), and asset symlinks that escape the module boundary. Safe module-local asset symlinks remain usable. Protected UI classes targeted through class attribute selectors are also recognized.

## Secondary spellings in titles

Word and sentence alternate spellings now appear as navigable secondary title content directly beneath the primary spelling. Character-style structural variants are no longer repeated in detail content.

## Unambiguous pronunciation titles

Primary and secondary spellings are no longer repeated as pronunciation metadata. Pronunciations remain plain title text and are never heuristically turned into writing-unit links, so displayed relationships continue to reflect only the module-provided Library graph.

## Library relationship and content-pack correctness

Deletion previews now honor cascade, detach, and restrict policies without turning dependents into explicit deletions. Hidden or placed records stay out of popup sequencing. Content-pack upgrades preserve omitted provider records by default, while publishers can explicitly request authoritative pruning.

## Durable and deterministic progress behavior

Progress retries compare events structurally, equal timestamps use event IDs as deterministic tie breakers, unsafe extreme dates are rejected before persistence, malformed JSON returns a client error, and disabled adapters gate their capabilities and flow hooks.

## Complete module stylesheet validation

External module validation now detects direct Cognis internal URLs in CSS imports and asset URLs as well as in scripts.

## Safe review-date bounds

Progress projections now cap review intervals at fourteen days, matching event timestamp validation and ensuring every accepted event remains rebuildable.

## Reliable dashboard navigation

Programmatic dashboard navigation now uses the generic route authorization hook instead of calling removed Study-specific helpers, preventing navigation from failing with a reference error.

## Consistent English package names

Version indexes now use the canonical English package names in every language variant, while the surrounding documentation remains localized.

## Reliable targeted module activation

Module activation now treats only the requested module as mandatory during the strict runtime refresh, so unrelated invalid or disabled modules cannot roll back a valid activation, including Study language modules. Disabled configuration bootstraps validate only their server-side API source tree, while full boundary validation remains mandatory before activation.

## Privileged module compatibility restored

The development baseline's privileged-module compatibility contract is restored: privileged modules may use their declared host runtime integrations without being rejected by the newer unprivileged-module boundary scan. Unprivileged modules remain fully scanned, and module-owned tests still run for both classes.

## Focused Study library pages

Detailed Library layer presentations now open as dedicated pages from the Study sub-navigation. The administrator Library root uses a compact, consistent layer index with entry counts, and the Study submenu now includes a localized Leaderboard page.

## Reliable Study pages and focused Library cards

More-specific adapter SPA routes now win over generic gateway child routes, so the Leaderboard mounts correctly. Study navigation falls back to its supplied label when an optional translation bundle is absent. Library previews now focus on the item and pronunciation, while detail cards expose pronunciations, definitions, metadata, relationships, and examples.

## Extensible scoring, achievements, and live competition

Core now orchestrates collection-based XP scoring with provider difficulty, activity weights, timed completion, first-completion and discrete repeat rewards, scoped global/provider modifiers, consumable boosters, and personal bests. Providers can register dynamic normal, rare, and legendary achievements whose evidence-backed awards are immutable and visible on permitted profiles. Study converts verified Progress event collections into leaderboard XP, serves live standings for personal, event, and classroom definitions, and animates retrospective rank movement with reduced-motion support.

## Public provider engagement contracts

Core now publishes scoring, achievement registration, and activity-recording capabilities through `ctx`, and the Study Leaderboard publishes its provider contract the same way. Scoring now validates bounded provider inputs, unique evidence, timing targets, and hint-assisted rewards. New localized component documentation explains registration, flow extension, evidence validation, privacy, and seasonal leaderboard operation.

## Separate Library administration and learning

The Library root is now an administrator-only editor for every record in the selected language, including hidden definition and relationship data. Learner layers mount on independent Study routes linked directly from the sub-navigation, while restoring the rich card presentation, definitions, metadata, filtering, variants, and detail views.

## Clean Library editing and reliable Study routes

Library layers now live in the administrator side menu. The selected layer renders as a clean row list whose theme-aware pencil opens a focused edit popup. Learner layer and Leaderboard routes now load the complete page-composer stylesheet bundle; the Leaderboard route no longer declares a server capability as a missing browser capability, so the app router mounts it directly instead of falling through to the generic Study child loader.

## Focused Library details and stable Study startup

Library previews now reserve fixed positions for metadata and scope while pronunciations and definitions live in the detail popup alongside a one-level inbound/outbound relationship tree. The administrator editor uses schema-derived controls and protected dirty tracking instead of raw JSON, and its theme-aware pencil remains visible at the row edge. Study routes stay registered during language initialization, and dependency-ordered adapter bootstrap ensures Progress is ready before Leaderboard.

## Responsive Study startup

Study adapter bootstrap now runs independent adapters concurrently while preserving declared dependency order. This removes the serialized startup delay that caused root probes to disconnect with HTTP 499, without allowing Leaderboard to initialize before Progress.

## Always-responsive base health check

The base Cognis URL now returns its dashboard redirect before persisted module and gateway state restoration finishes. Nginx and Kubernetes health checks therefore receive an immediate response instead of timing out with HTTP 499 while runtime extensions initialize.

## Health endpoints available during restoration

Both container health endpoints now bypass the runtime-state restoration barrier, matching the Docker healthcheck script that probes `/api/v1/system/health`. This allows the Cognis container to become healthy so the dependent Nginx service can start.

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
- [799fc33d](https://github.com/Cognis-Labs-HQ/Cognis/commit/799fc33d)
- [d472ffa9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d472ffa9)
- [992973f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/992973f5a421fa0043bfa792a1b4757abcff8209)
- [4c7366ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c7366adec02748038211fcdf407f8b5b2ea759e)
- [2b097121](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b097121)
- [223044e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/223044e0)
- [5ae64121](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ae64121)
- [504e4b2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/504e4b2b)
- [a0f0832a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0f0832a)
- [8d78ecd3](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d78ecd3)
- [633e2579](https://github.com/Cognis-Labs-HQ/Cognis/commit/633e2579)
- [73464474](https://github.com/Cognis-Labs-HQ/Cognis/commit/73464474)
- [da7bfcc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/da7bfcc3)
- [9748e38a](https://github.com/Cognis-Labs-HQ/Cognis/commit/9748e38a)
- [dd548a27](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd548a27)
- [dd89e8c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd89e8c9)
- [89294560](https://github.com/Cognis-Labs-HQ/Cognis/commit/89294560)
- [bedc1992](https://github.com/Cognis-Labs-HQ/Cognis/commit/bedc1992)
