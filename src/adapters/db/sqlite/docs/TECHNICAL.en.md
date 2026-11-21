# Technical Reference

The public interfaces and operational rules of SQLite.

## Interfaces

`SqliteDbGateway(client)` implements DatabaseGateway. SqliteClient must supply all(statement, params), run(statement, params) returning changes, and exec(statement). Structured commands use SQLite placeholders and conflict clauses.

## Configuration

The embedding runtime creates and configures the client and file path. This adapter declares no SQLITE_PATH setting or standard executor factory; DB_TYPE=sqlite alone cannot select it in the bundled server.

## Behavior

### Overview

The SQLite adapter provides a lightweight database gateway for SQLite-backed deployments, local development, and tests that need an embedded relational store.

### Responsibilities

- Implement the `DatabaseGateway` interface through `SqliteDbGateway`.
- Execute queries, commands, and transactions against a provided SQLite client.
- Support structured database commands with SQLite placeholder and conflict syntax.
- Provide SQLite-specific auth schema helpers and SQL init/migration scripts.

## Security

Bind data through parameters and protect the database file and backups using host filesystem permissions. Application authorization must run before invoking the adapter.

## Reference

- [src/adapters/db/sqlite/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/manifest.json)
- [src/adapters/db/sqlite/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/package.json)
- [src/adapters/db/sqlite/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/index.ts)
