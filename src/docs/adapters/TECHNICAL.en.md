# Technical Reference

The public interfaces and operational rules of Adapters.

## Interfaces

Adapters expose factories and bootstrap hooks defined by their gateway contracts. Database adapters implement structured executor factories; authentication adapters return AuthProviderAdapter; notification senders register delivery metadata and owned diagnostics.

## Configuration

Each adapter declares its settings through the owning gateway contract. Authentication providers, notification senders and database factories have different schemas; a manifest alone does not prove that a remote connection is implemented.

## Behavior

OIDC and SAML in this source tree require an injected protocol client. Their configuration forms do not create a client; see the adapter Technical views before planning those deployments.

### Overview

`src/adapters/` contains all provider-specific implementations of gateway interfaces. An adapter is a concrete class that implements a contract defined in `src/core/` or a gateway — it knows how to talk to a specific technology (PostgreSQL, MariaDB, LDAP, SMTP) while exposing a uniform interface to the rest of the platform.

Adapters are intentionally isolated. They may use any provider-specific library internally, but their public behaviour must conform to the interface their gateway defines. Swapping a database backend means changing `DB_TYPE` in the environment; no application code outside the gateway changes.

Each adapter lives under `src/adapters/<gateway-id>/<adapter-id>/` and carries its own `package.json` (with a `version` field), tests, and documentation. The owning gateway discovers adapters by scanning that directory at startup. Neither the server nor core knows which adapters are present.

### Responsibilities

- Implement gateway interfaces for specific external providers.
- Manage provider-specific connection details, SQL dialects, and error handling internally.
- Carry their own schema initialisation SQL (for DB adapters) under `sql/init/` and `sql/migrate/`.
- Carry their own tests, documentation, and version manifest.

Not responsible for: business logic, routing, or any behaviour that belongs to the gateway layer.

### Directory convention

```
src/adapters/
  db/
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

### File structure conventions

An adapter's `index.ts` is the public surface of the adapter. It must re-export everything external callers need: the bootstrap function, public types, and any factory functions. Internal implementation files (connection logic, helpers, sub-classes) live as siblings to `index.ts` within the adapter directory and are never imported directly from outside the adapter.

For complex adapters whose `index.ts` would exceed approximately 400 lines, apply the same split pattern used for gateways: create a sub-directory, keep `index.ts` as the orchestrator that imports from sub-files, and extract logical chunks into focused sibling files.

Never place implementation logic directly in a file named after the adapter's technology (e.g. `smtp-notification-sender.ts` as the main export surface). The directory name already provides technology context; `index.ts` is always the entry point.

### DB adapter shared layer

Database drivers implement structured commands and dialect behavior. Domain persistence belongs to its owner: local accounts in src/adapters/auth/local/store.ts, profiles in src/adapters/social/profile/store.ts and preferences in src/adapters/social/profile/preference-store.ts. Cross-component callers use registered capabilities rather than importing these concrete stores.

### Coverage table

| Area          | Adapter    | Path                        | Notes                            |
| ------------- | ---------- | --------------------------- | -------------------------------- |
| Database      | PostgreSQL | `src/adapters/db/postgres/` | Default production relational DB |
| Database      | MariaDB    | `src/adapters/db/mariadb/`  | Production relational DB         |
| Database      | Memory     | `src/adapters/db/memory/`   | Tests and isolated CI only       |
| Auth          | Local      | `src/adapters/auth/local/`  | Always enabled; scrypt hashing   |
| Auth          | LDAP       | `src/adapters/auth/ldap/`   | Directory-based enterprise auth  |
| Auth          | SAML       | `src/adapters/auth/saml/`   | SAML 2.0 assertion-based SSO     |
| Auth          | OIDC       | `src/adapters/auth/oidc/`   | OAuth2/OIDC token introspection  |
| File storage  | Local      | `src/adapters/file/local/`  | Filesystem-backed uploads        |
| Notifications | SMTP       | `src/adapters/notify/smtp/` | Email delivery via SMTP          |

## Security

Adapters own transport secrets and runtime contracts. Tests and diagnostics must not disclose configured passwords; provider registration must be disposed when its owner is disabled.

## Reference

### `package.json` and versioning

Every adapter carries a `package.json` with a `version` field following Semantic Versioning. Any change to the adapter's code, schema, or public interface requires a version bump. The `main` field must always point to `index.ts` — this is the adapter's orchestrating entry point and the file the owning gateway dynamically imports. Some adapters also carry a `manifest.json` with runtime metadata (e.g. `"locked": true` for the local file adapter, which cannot be swapped out at runtime).

```json
{
    "name": "@cognis/adapter-notify-smtp",
    "version": "0.2.1",
    "private": true,
    "type": "module",
    "main": "index.ts"
}
```
