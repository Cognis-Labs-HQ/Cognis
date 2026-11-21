# Search Selection Ownership

**Feature Branch:** feature-search-selection-ownership

## Wait for selection outcomes

Search awaits asynchronous selection, prevents duplicate pending callbacks and retains the query, category and multi-selection after failures only while its owner remains active. Strict false keeps the popup open without error while its owner remains active; undefined remains successful. Native footer clicks support keyboard and browser activation.

## Respect selection lifetimes

Optional owner signals, provider removal and account changes prevent stale UI completion without undoing dispatched operations. The translated workspace tutorial explains waiting and checking the destination before retrying, retaining its existing progression and replay.

Navbar selection propagates `navigateTo` returning `false` before route teardown, preserving Search without an error when navigation is refused. Once `route-will-change` or `pagehide` fires, Search is dismissed as lifecycle cancellation even if the destination later fails to mount. Outcome feedback then belongs to the destination or router, not the dismissed Search popup.

## Commits

- [503f60be5a55aec1f8aedaf03d254d7c1c26f9e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/503f60be5a55aec1f8aedaf03d254d7c1c26f9e4)
- [8aa74a09b59194319593c51b12aa7f490bbfc5f4](https://github.com/Cognis-Labs-HQ/Cognis/commit/8aa74a09b59194319593c51b12aa7f490bbfc5f4)
