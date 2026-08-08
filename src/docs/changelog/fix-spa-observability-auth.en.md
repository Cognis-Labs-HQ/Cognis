# Reliable SPA Telemetry

## Authentication follows token changes

Browser performance telemetry now uses the Observability gateway client and retries once when an in-flight request overlaps an access-token replacement, preventing incidental 401 responses during SPA navigation.
