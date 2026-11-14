# Keep Message Text Selected

**Feature Branch:** feature-message-selection-recovered

## Preserve Selection During Live Updates

Unchanged message bodies keep their DOM nodes when messages, reactions or reader metadata change. Forward, backward and adjacent-message selections remain attached to the same text. Changed or deleted selected text follows native selection behavior.

## Retain Loaded History And Reaction State

Live updates and Load Earlier merge without dropping loaded rows. Queued messages do not count toward server pagination. Acknowledged historical reactions update immediately and refresh their existing page; failed reads do not retry mutations.

Late live or historical responses retain the newer queued projection, including after pending work is cleared or acknowledged. Unchanged polls advance snapshot ownership, and discarded projections invalidate cached signatures. Failed reaction refreshes retain acknowledged state and selection for both recent and older messages.

Older latest-page responses no longer replace a newer publication, including acknowledged queued messages, metadata and pending-request state. Explicit history requests still merge. Stale read errors retain newer visible content.

Overlapping history reads now share view-owned ordering with acknowledged reactions. Newer row metadata and proven deletions survive older results; obsolete follow-up read errors stay silent while current read and mutation failures remain visible. Coverage coalesces relative to active reads and is released when they finish, with conservative timestamp boundaries.

Cached and shared in-flight responses do not gain new server authority. They retain known rows and may fill missing earlier history without reviving a live-complete prefix. Acknowledgement order is distinct from live-read evidence for pagination. Source-tagged signatures let later fresh reads reconcile identical raw payloads. Regression tests cover offline fallback, shared pre-acknowledgement reads, both completion orders, monotonic no-ops and stalled-read bounds.

Obsolete view outcomes now remain distinct from current read failures at every renderer caller. Successful or failed old completions after a same-room style, key or container replacement cannot show stale action errors or start read-status and typing follow-ups.

## Cover Real DOM Behavior

Messages 2.7.43 adds locked, test-only jsdom coverage through the exported renderer and offline-client contracts. The localized history guide explains selection and loading earlier messages. Geometry assertions cover scroll policy, not browser pixels or clipboard behavior.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e97da45b9978f41038e9ec45649457d21f8557c
