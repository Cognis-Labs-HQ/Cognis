# Module Capability Refresh

**Feature Branch:** fix-external-module-capability-refresh

## Live public capability lookup

Fix external-module lookups so published provider capabilities remain visible through the live system ctx. This restores Whiteboard-owned board data to meeting consumers while keeping private capabilities hidden.

## Sequential runtime refresh

Serialize module refresh requests to prevent overlapping teardown and capability registration. Add regression coverage for separate capability stores, verified providers, repeated refresh, disable/re-enable, concurrent refresh, and recovery after failure. Bump the API Server to 0.6.4.

## Commits
