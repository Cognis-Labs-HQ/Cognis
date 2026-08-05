# Production performance and observability

## Secure, cache-aware production edge

Added an HTTP/2 TLS edge with connection reuse, Brotli/gzip compression, immutable hashed assets, HTML revalidation, trusted forwarding headers, and private API responses. The edge service and image are named `cognis-web` in every Compose file, published by GitLab CI, installs Brotli through Alpine's native Nginx module package, overwrites the standard `default.conf` server slot at startup, and can run HTTP-only with `COGNIS_EDGE_TLS_MODE=deferred` when TLS terminates upstream; setup now asks whether an upstream reverse proxy is used and writes that mode automatically. Compose now uses an authenticated PostgreSQL healthcheck before starting Cognis and waits for the `cognis` healthcheck before starting `cognis-web`, and the generated Nginx config avoids duplicate HTML MIME warnings, deprecated HTTP/2 listen syntax, and unquoted hashed-asset regex parsing.

## Vendor-neutral performance telemetry

Added ctx-backed server, database, cache, event-loop, Web Vitals, transfer, and SPA mount measurements with bounded labels and sampling. DB timing now preserves the raw executor surface used during schema initialization, and required gateway bootstrap failures now report their root cause immediately instead of later surfacing as a missing dependency.

## Measurable performance budgets

Documented hosted cold, warm, and SPA baselines plus budgets that must be evaluated before adding Redis.
