# Production performance and observability

## Secure, cache-aware production edge

Added an HTTP/2 TLS edge with connection reuse, Brotli/gzip compression, immutable hashed assets, HTML revalidation, trusted forwarding headers, and private API responses. The edge service and image are named `cognis-web` in every Compose file, published by GitLab CI, installs Brotli through Alpine's native Nginx module package, overwrites the standard `default.conf` server slot at startup, and can run HTTP-only with `COGNIS_EDGE_TLS_MODE=deferred` when TLS terminates upstream. Compose now waits for the `cognis` healthcheck before starting `cognis-web`, and the generated Nginx config avoids duplicate HTML MIME warnings, deprecated HTTP/2 listen syntax, and unquoted hashed-asset regex parsing.

## Vendor-neutral performance telemetry

Added ctx-backed server, database, cache, event-loop, Web Vitals, transfer, and SPA mount measurements with bounded labels and sampling. DB timing now preserves the raw executor surface used during schema initialization.

## Measurable performance budgets

Documented hosted cold, warm, and SPA baselines plus budgets that must be evaluated before adding Redis.
