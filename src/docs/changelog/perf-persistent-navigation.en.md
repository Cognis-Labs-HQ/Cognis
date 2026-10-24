# Persistent Navigation

**Feature Branch:** perf-persistent-navigation

## Persistent Navigation

Route and document loading use the full-window shade. Superseded navigation releases its loading token immediately; pending content and runtime errors retain their existing loading and error surfaces.

The visible page keeps its route styles while the destination loads. Destination styles are staged inactive and become active when content commits; superseded or failed preparations release only their own styles. Shared controls and open component windows retain their owned styles until disposal. Production documents preserve stylesheet source identity so direct loads and SPA navigation share the same ownership.

Initial route adoption claims only declared route styles or production document styles with source metadata. Styles injected by notification and other persistent providers remain owned by those providers, so a route commit cannot remove the notification bell sizing rules.

Each shell composition requests current preferences once for theme and language controls and schedules one avatar refresh after provider readiness. Unchanged avatar nodes remain mounted. Late avatar results are rejected after account, token, provider or refresh changes. No private-response cache is introduced.

## Commits

- [ab071e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab071e280a6109d8d617e006fba9f2fe80419548)
- [efa41cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/efa41cb9a5cdcc671d38888fa89bb6697fa30d03)
- [15ab62e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ab62e625481975126e11f43440311254825e01)
