# Reliable SPA Telemetry

**Feature Branch:** feature-fix-intermittent-401-error-in-spa

## Authentication follows token changes

Browser performance telemetry now uses the Observability gateway client and retries once when an in-flight request overlaps an access-token replacement, preventing incidental 401 responses during SPA navigation.

## Telemetry uses a UI capability

Browser performance telemetry now resolves submission through the Observability gateway's registered UI capability, keeping the shared UI independent of gateway implementation details.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/55815c3e03a8498211a2619ef9e4ee61895461a5
