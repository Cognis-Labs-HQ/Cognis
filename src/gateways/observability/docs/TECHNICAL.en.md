# Technical Reference

The public interfaces and operational rules of Performance Monitoring.

## Interfaces

observability:metrics.record(name, value, labels) records finite allowlisted values. POST /api/v1/observability/client accepts metrics and navigation, at most sixteen metrics and a 16,384-character accumulated request body.

## Configuration

The built-in sink records debug logs. Metric names and label keys are fixed allowlists; a replacement sink implements observability:metrics.record without adding a vendor-specific route.

## Behavior

### Observability gateway

The gateway exposes the vendor-neutral `observability:metrics` ctx capability and a size-limited, sampled browser telemetry endpoint. Metric names and labels are allowlisted to keep cardinality bounded. Deployments can replace the capability sink without coupling routes or gateways to a telemetry vendor.

## Security

POST /api/v1/observability/client requires a user session. Names and label keys are allowlisted, label values are truncated to eighty characters, and each account may submit at most six requests per minute.

## Reference

### Technical specification

Metric names and labels are allowlisted, browser payloads are sampled and size-limited, and the sink remains vendor-neutral and replaceable through the capability contract.
