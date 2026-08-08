# Reliable SPA Telemetry

## Authentication follows token changes

Browser performance telemetry now uses the Observability gateway client and retries once when an in-flight request overlaps an access-token replacement, preventing incidental 401 responses during SPA navigation.

## Telemetry uses a UI capability

Browser performance telemetry now resolves submission through the Observability gateway's registered UI capability, keeping the shared UI independent of gateway implementation details.
