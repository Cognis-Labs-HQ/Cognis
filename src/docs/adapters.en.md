# Adapters

## Overview

`src/adapters/` contains all provider-specific implementations of gateway interfaces. An adapter is a concrete class that implements a contract defined in `src/core/` or a gateway — it knows how to talk to a specific technology (SQLite, MariaDB, LDAP, SMTP) while exposing a uniform interface to the rest of the platform.

Adapters are intentionally isolated. They may use any provider-specific library internally, but their public behaviour must conform to the interface their gateway defines. Swapping a database backend means changing `DB_TYPE` in the environment; no application code outside the gateway changes.

Each adapter lives under `src/adapters/<gateway-id>/<adapter-id>/` and carries its own `package.json` (with a `version` field), tests, and documentation. The owning gateway discovers adapters by scanning that directory at startup. Neither the server nor core knows which adapters are present.

## Responsibilities

- Implement gateway interfaces for specific external providers.
- Manage provider-specific connection details, SQL dialects, and error handling internally.
- Carry their own schema initialisation SQL (for DB adapters) under `sql/init/` and `sql/migrate/`.
- Carry their own tests, documentation, and version manifest.

Not responsible for: business logic, routing, or any behaviour that belongs to the gateway layer.

## Architecture

### Directory convention

```
src/adapters/
  db/
    sqlite/      — SqliteDbGateway implementing DatabaseGateway
    mariadb/     — MariaDbGateway implementing DatabaseGateway
    postgres/    — PostgresDbGateway implementing DatabaseGateway
    memory/      — MemoryDatabaseGateway (test/dev only)
    reuse/       — Shared store abstractions used across all DB adapters
  auth/
    local/       — DbLocalAccountStore with scrypt password hashing
    ldap/        — LdapAuthAdapter for directory-based login
    saml/        — SamlAuthAdapter for SAML 2.0 assertions
    oidc/        — OidcAuthAdapter for OAuth2/OIDC token introspection
  notify/
    smtp/        — SmtpNotificationSender for email delivery
  file/
    local/       — LocalFileGateway for filesystem-backed file storage
```

### `package.json` and versioning

Every adapter carries a `package.json` with a `version` field following Semantic Versioning. Any change to the adapter's code, schema, or public interface requires a version bump. Some adapters also carry a `manifest.json` with runtime metadata (e.g. `"locked": true` for the local file adapter, which cannot be swapped out at runtime).

### DB adapter shared layer

`src/adapters/db/reuse/` contains store abstractions shared across all DB adapters:

| Module | Purpose |
| ------ | ------- |
| `account-store.ts` | Account persistence (create, find, update) |
| `profile-store.ts` | Profile CRUD, social graph, posts |
| `preference-store.ts` | User preference key/value persistence |
| `notification-store.ts` | Notification config and preference persistence |

These reuse modules are instantiated by gateways at bootstrap time. They receive a `DbExecutor` and `SupportedDbType` and generate the correct SQL dialect internally.

## Coverage table

| Area | Adapter | Path | Notes |
| ---- | ------- | ---- | ----- |
| Database | SQLite | `src/adapters/db/sqlite/` | Default; no external service needed |
| Database | MariaDB | `src/adapters/db/mariadb/` | Production relational DB |
| Database | PostgreSQL | `src/adapters/db/postgres/` | Production relational DB |
| Database | Memory | `src/adapters/db/memory/` | Tests and isolated CI only |
| Auth | Local | `src/adapters/auth/local/` | Always enabled; scrypt hashing |
| Auth | LDAP | `src/adapters/auth/ldap/` | Directory-based enterprise auth |
| Auth | SAML | `src/adapters/auth/saml/` | SAML 2.0 assertion-based SSO |
| Auth | OIDC | `src/adapters/auth/oidc/` | OAuth2/OIDC token introspection |
| File storage | Local | `src/adapters/file/local/` | Filesystem-backed uploads |
| Notifications | SMTP | `src/adapters/notify/smtp/` | Email delivery via SMTP |

## Extension Points

To add a new adapter for an existing gateway, create a directory under `src/adapters/<gateway-id>/<adapter-id>/` containing:

- The adapter implementation (TypeScript class implementing the gateway interface).
- A `package.json` with `name`, `version`, and a `main` field pointing to the entry module.
- An exported `createAdapter()` function that the gateway calls during discovery.
- A `docs/index.en.md` following the documentation standard.
- Tests under `tests/`.
