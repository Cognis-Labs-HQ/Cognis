# Production performance and observability

## Secure, cache-aware production edge

Added an HTTP/2 TLS edge with connection reuse, Brotli/gzip compression, immutable hashed assets, HTML revalidation, trusted forwarding headers, and private API responses. The edge is named `cognis-web` in Compose, is published by GitLab CI, and can run HTTP-only with `COGNIS_EDGE_TLS_MODE=deferred` when TLS terminates upstream.

## Vendor-neutral performance telemetry

Added ctx-backed server, database, cache, event-loop, Web Vitals, transfer, and SPA mount measurements with bounded labels and sampling.

## Measurable performance budgets

Documented hosted cold, warm, and SPA baselines plus budgets that must be evaluated before adding Redis.
