# Filter New Room search to users

**Feature Branch:** work

## User-only room discovery

The Messages New Room picker now passes the shared search utility’s user category and type filter, matching the filtered-search parameters used by Jitsi Meet and excluding unrelated result types.

## Responsive search status

Search now replaces the minimum-length prompt with a loading state as soon as an eligible query runs. Failed and timed-out requests render an explicit error instead of leaving stale results or an unresponsive prompt.

## Synchronized incoming-call prompts

Incoming calls now appear in a bar immediately above the Messages thread header. Answer and Decline resolve the correlated notification and in-chat prompt together, while a per-user ringing lease prevents multiple tabs or surfaces from playing duplicate ringtones.

## Visible call bar and focused PiP

Incoming-call state now refreshes the selected room so its action bar appears directly below the thread header while the notification may remain visible. Spawned VoIP components are explicitly marked with the Jitsi Meet `voipCall` context, keeping meeting chat out of the PiP surface.

## Safe PiP teardown

Closing a VoIP call in PiP now validates the original portal hierarchy and safely falls back when the browser rejects a state-preserving atomic move. Component teardown can finish without an unhandled `HierarchyRequestError`.

## Full-height docked call stage

Docked provider calls now use the full remaining height of the Messages widget card. The active thread collapses to header and call-stage rows, while the stage, component host, and component window all stretch through the available content row.

## Reliable ringing cleanup and PiP return

Late ringing-lease requests now succeed with a non-ringing result after a call has ended. Closing a call from PiP after SPA navigation offers Return to Messages, Hang Up, and Cancel with consequence-appropriate actions. Returning navigates to the call room and restores the existing provider component without remounting it.

## Stable PiP close control

The PiP close action now retains the active call in its stage lifecycle, eliminating the navigation-time `ReferenceError`. The close control again uses the standard floating-window size and now carries the destructive `btn-cancel` class.

## Idempotent leave and repeat PiP persistence

Late provider teardown no longer reports an error when the server has already ended the call; leave now succeeds idempotently and cleanup suppresses the known unavailable-call race. Returning to Messages and entering PiP a second time now preserves the call across the next SPA navigation.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
