# Usage

Practical procedures for Performance Monitoring.

## Prerequisites

Operators need access to the configured metric sink; the default sink writes debug logs.

## Examples

Enable suitable debug logging, reproduce a slow request and compare its HTTP or database timing with a repeat under the same conditions.

Resolve `observability:metrics` through `ctx.capabilities` for server metrics, or submit allowlisted browser telemetry through the gateway endpoint.

## Expected Results

Allowed measurements reach the metric capability; sampled browser submissions do not describe every visit.

## Troubleshooting

Check log level and sampling. The built-in gateway does not provide a standalone metrics dashboard.
