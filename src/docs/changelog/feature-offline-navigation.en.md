# Offline Navigation

**Feature Branch:** feature-offline-navigation

## Offline Contract

Production builds prepare a neutral recovery shell. License and Error work offline; unavailable route links are disabled and unavailable direct navigation stays quiet. A real server connection failure activates fallback even when the browser reports an active network.

Declare `public: true` and `offline: { assets: [...] }` on a SPA route. List every public runtime dependency, including locale catalogs and data files. Pages must work without API requests, private account data or host-wide provider discovery. Private routes cannot opt in. Use route links for navigation controls. Unknown or unvisited dependencies remain unavailable.

The service worker does not cache API responses, credentials or authenticated HTML. Module invalidation clears the public route catalog and module assets; revision-qualified assets must match the current catalog. Remote changes cannot be observed while disconnected: only the last known public revision is available. Recovery refreshes the catalog and reloads through the dirty-page guard, restoring fresh server authorization. Worker updates wait for existing tabs to close and prepare the recovery set before activation. A first visit without an installed worker cannot start offline.

## Reminder Selection

Select several reminders using the standard visible checkboxes. Each selection remains visible and is saved together. Removing every selection disables reminders, including when the calendar has defaults. Existing custom reminder offsets remain available when editing.

## Offline Study

Offline Mode is enabled by default in Settings. Turning it off restores the existing connection warning and error behavior and disables worker fallback. With it enabled, connection loss quietly enters offline mode; unavailable navigation is blocked without an error popup.

Study keeps bounded lightweight JSON snapshots in the current tab: schemas, permitted character/card data, locations, viewed IDs, favourites and previously opened decks. Language schemas opt in with `metadata.offline: { cache: "lightweight" }`. The Library cache holds at most 16 MB and 100 reads; other read caches hold at most 4 MB and 100 reads. No audio bytes, dictionary responses, credentials or authenticated documents are persisted.

Explore previews resolve relationships from already-authorized cached rows. Drawing and flashcard practice work locally. Completions, reviews, viewed IDs and final favourite states are queued for delivery; progress, XP and rewards become authoritative only after server acknowledgement. Audio and dictionary/ElevenLabs requests stop. Content edits, deletion and sharing require connectivity. Only previously loaded content within the cache limits is available.

Private Study requires the same previously verified, unexpired account session in the same tab. Reloads and first visits retain the public-only offline contract. Account/session changes, preference changes, module lifecycle changes and provider disposal invalidate private snapshots. Server revocations cannot be learned while disconnected. Recovery uses the existing unsaved-change guard and reloads to refresh server authorization.

## Queued Delivery and Consent

The host exposes `offline:outbox`, `offline:state` and `offline:accessPolicy` through ctx. Components register delivery handlers for their provider lifetime and submit stable operation IDs through `offline:enqueue`; `offline:flush` authorizes and delivers. The durable account-bound queue holds at most 1,000 records and 1 MB for seven days, without tokens. It preserves original IDs and timestamps, retries transient failures and removes acknowledged or permanently rejected records. A localized warning reports rejected records. Logout clears the account queue; changing accounts never replays another account’s data. Disabling Offline Mode stops new queued writes. Pending writes may still deliver online.

Recovery refreshes providers and runs `authenticate-session` before the final `afterSession` stage can replay activity. Required providers declare `offlineAccessGuard` in the server catalog. Unknown requirements or missing consent fail closed. Terms of Service caches the latest fetched document versions and server-confirmed acceptance per account. A new unaccepted version immediately blocks offline reads, navigation and queued writes, and prevents replay until online consent succeeds. Offline acceptance is unavailable. Private content snapshots remain tab-local; only the bounded operation queue and legal snapshots survive reload. The initial `beforeSession` stage clears prior delivery verification before each authentication pass.

## Commits

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
- [39bc5c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/39bc5c3c81a7b87b096d8ed665aa3ddeee7e4c93)
- [5cfeb11](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cfeb11f0684d87760f8cc697bd42df4fcdd72b9)
