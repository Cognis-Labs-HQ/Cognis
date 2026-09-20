# Cognis Overview

## Overview

Cognis is a modular language-study platform designed for independent learners, teachers, and communities. It combines structured learning content with social features, real-time collaboration readiness, and a deeply extensible backend architecture. The goal is to make it straightforward to deploy a self-hosted language learning environment that can grow from a single user to a full community without changing the core codebase.

The platform is built around a gateway-first architecture: every major subsystem (authentication, notifications, profiles, file storage, logging) is a gateway that owns its own routes, adapters, UI contributions, tests, and documentation. The core of the application defines contracts and policy; it never imports concrete gateway or adapter code. This separation means you can add a new database backend, swap an authentication provider, or remove a subsystem entirely by changing configuration, not by editing shared code.

Adapters are provider-specific implementations of gateway interfaces. Each gateway discovers its adapters at startup by scanning a known directory rather than maintaining a static import list. The result is that adding a new adapter — say, an S3-backed file storage adapter — requires only placing the adapter directory in the right location; the server assembles the full capability set from what is present.

Modules extend the platform with optional features: content types, curricula, analytics, or integrations. Like gateways, modules are self-contained and auto-discovered. They contribute CSS, HTML templates, and JavaScript behaviour to the UI through a defined frontend contract, and they register their own API routes through a protected mechanism that prevents collisions with core namespaces.

## Responsibilities

- Provide the platform foundation: HTTP server, auth, persistence, file storage, logging, and notification dispatch.
- Define the gateway/adapter pattern and the capability store that wires gateways together.
- Host the UI shell, page composer, and i18n infrastructure.
- Manage module lifecycle: discovery, enablement, and route safety.
- Serve the in-app documentation browser from auto-discovered `docs/` directories.

Not responsible for: specific auth provider logic (adapters), specific database SQL (adapters), specific notification transport (adapters), or content delivered by modules.

## Architecture

### Layer model

```
core/            — contracts, interfaces, policy services
gateways/        — domain orchestrators (auth, db, notify, profile, files, logging)
adapters/        — concrete provider implementations (postgres, ldap, smtp, etc.)
modules/         — optional feature extensions
api/             — HTTP server, route registry, request/response layer
ui/              — browser frontend (pages, layouts, reuse utilities, styles)
```

Core defines `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore`, and other interfaces in `src/core/contracts/`. Gateways import from core; core never imports from gateways. This one-way dependency is the primary architectural invariant.

Each gateway has a `bootstrap(ctx)` function that receives a `GatewayBootstrapContext`. The context provides access to the capability store (`ctx.capabilities`), the route registry (`ctx.routeRegistry`), the gateway registry (`ctx.gatewayRegistry`), and the current database executor and type. Gateways contribute capabilities to the store (`ctx.capabilities.contribute('key', value)`) and other gateways retrieve them (`ctx.capabilities.get('key')`).

### Capability store

The capability store is the injection mechanism that connects gateways without direct imports. For example, the logging gateway reads `file:append` from the capability store (contributed by the files gateway) and passes it to the Logger so that log writes go through the file gateway abstraction. The profile gateway reads `file:gateway` (also from files) to handle avatar uploads.

### Auto-discovery

Gateways are discovered by scanning `src/gateways/` at startup. Each gateway directory contains a `bootstrap.ts` and a `manifest.json`. The server loads gateways in dependency order determined by the `requires` field in each manifest.

Adapters are discovered by each gateway scanning `src/adapters/<gateway-id>/` at its own bootstrap time. Neither core nor the server has any knowledge of which adapters are installed.

Modules are discovered only from installed repositories under `COGNIS_EXTERNAL_MODULES_ROOT`. A pointer file mechanism (nginx-style `<id>.load` symlinks) controls which modules are active.

### Key source locations

| Area                     | Path                              |
| ------------------------ | --------------------------------- |
| Core contracts           | `src/core/contracts/`             |
| Core services            | `src/core/services/`              |
| HTTP server entry        | `src/api/main.ts`                 |
| Route registry           | `src/api/reuse/route-registry.ts` |
| Gateway shared utilities | `src/gateways/shared.ts`          |
| Gateway bootstrapper     | `src/api/bootstrap/gateway.ts`    |
| UI entry points          | `src/ui/app/`                     |
| UI reuse utilities       | `src/ui/reuse/`                   |
| Platform docs            | `src/docs/`                       |

## Extension Points

Cognis is extended through three mechanisms:

- **Gateways**: add a directory under `src/gateways/` with `bootstrap.ts` and `manifest.json`. The server picks it up automatically.
- **Adapters**: add a directory under `src/adapters/<gateway-id>/`. The owning gateway discovers and loads it.
- **Modules**: install a repository through the Module Marketplace into the configured external module path. Enable via the admin UI or `cognisctl`.
