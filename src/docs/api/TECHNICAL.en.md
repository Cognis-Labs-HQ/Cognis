# Technical Reference

The HTTP host dispatches registered routes and serves component discovery and versioned documentation.

## Interfaces

`GET /api/v1/system/healthcheck` is the lightweight liveness probe. `GET /api/v1/system/health` includes component health. `GET /api/v1/ui/capability-providers` filters providers by session and declared access; anonymous callers receive explicitly public providers without a role policy.

Documentation methods, response fields and language selection are specified by the [server reference](/docs/components/api/technical). Domain endpoints are owned by [Auth](/docs/gateways/auth/technical), [Calendar](/docs/gateways/calendar/technical), [Share](/docs/gateways/share/technical) and their peers.

## Configuration

The source runtime reads `PORT` (default `3000`) and `LISTEN_HOST` (default `0.0.0.0`). `COGNIS_GATEWAYS_ROOT` and `COGNIS_ADAPTERS_ROOT` override discovery paths. Container settings and connection fields are described in [DevOps](/docs/devops/technical); database driver configuration belongs to [DB](/docs/gateways/db/technical).

## Behavior

Bootstrap loads registered gateway routes and UI descriptors. Core routes dispatch HTTP requests; domain owners implement validation, persistence and authorization. Browser discovery is session-sensitive and is refreshed on identity changes. Public liveness does not execute slow optional health contributors.

## Security

Bearer/session claims and route policy are checked before protected work. Roles alone do not replace resource checks. Credentials, private payloads and authorization decisions must not appear in public documentation or diagnostic URLs.

## Reference

- [src/api/main.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/main.ts)
- [src/api/server.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/server.ts)
- [src/api/reuse/route-registry.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/route-registry.ts)
- [src/api/routes/docs/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/routes/docs/index.ts)
