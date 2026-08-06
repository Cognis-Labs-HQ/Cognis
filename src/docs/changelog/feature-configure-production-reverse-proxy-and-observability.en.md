# Production performance and observability

## Secure, cache-aware production web

Added an HTTP/2 TLS web with connection reuse, Brotli/gzip compression, immutable hashed assets, HTML revalidation, trusted forwarding headers, and private API responses. The web service and image are named `cognis-web` in every Compose file, published by GitLab CI, installs Brotli through Alpine's native Nginx module package, overwrites the standard `default.conf` server slot at startup, and can run HTTP-only with `COGNIS_WEB_TLS_MODE=deferred` when TLS terminates upstream. Setup writes mode and configurable certificate paths to an isolated web env file; `cognis-web` therefore cannot read Cognis encryption keys or database credentials. Compose uses an authenticated PostgreSQL healthcheck before starting Cognis and waits for the `cognis` healthcheck before starting `cognis-web`. Module route refreshes now initialize Nextcloud Whiteboard runtime resources only once, observability explicitly declares that it has no adapters, and saved security settings remain visible while component metadata refreshes instead of briefly reverting to empty defaults.

Deferred origins bind to loopback by default while locally terminated TLS binds publicly. Setup provisions an initial self-signed certificate, hashed assets use the complete esbuild hash alphabet, and GitHub releases publish the required `cognis-web` image.

## Vendor-neutral performance telemetry

Added ctx-backed server, database, cache, event-loop, Web Vitals, transfer, and SPA mount measurements with bounded labels and sampling. DB timing now preserves the raw executor surface used during schema initialization, and required gateway bootstrap failures now report their root cause immediately instead of later surfacing as a missing dependency.

Browser performance submissions require an authenticated session, enforce per-account rate limits, cap metric batches, preserve document metrics across SPA navigation, and calculate CLS using Web Vitals session windows.

## Measurable performance budgets

Documented hosted cold, warm, and SPA baselines plus budgets that must be evaluated before adding Redis.
