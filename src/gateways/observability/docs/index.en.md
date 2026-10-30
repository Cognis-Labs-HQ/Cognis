# Observability gateway

The gateway exposes the vendor-neutral `observability:metrics` ctx capability and a size-limited, sampled browser telemetry endpoint. Metric names and labels are allowlisted to keep cardinality bounded. Deployments can replace the capability sink without coupling routes or gateways to a telemetry vendor.

## Usage examples

Resolve `observability:metrics` through `ctx.capabilities` for server metrics, or submit allowlisted browser telemetry through the gateway endpoint.

## Technical specification

Metric names and labels are allowlisted, browser payloads are sampled and size-limited, and the sink remains vendor-neutral and replaceable through the capability contract.
