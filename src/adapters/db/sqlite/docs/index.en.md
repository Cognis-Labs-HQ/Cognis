# SQLite Database Adapter

## Overview

The SQLite adapter provides a lightweight database gateway for SQLite-backed deployments, local development, and tests that need an embedded relational store.

## Responsibilities

- Implement the `DatabaseGateway` interface through `SqliteDbGateway`.
- Execute queries, commands, and transactions against a provided SQLite client.
- Support structured database commands with SQLite placeholder and conflict syntax.
- Provide SQLite-specific auth schema helpers and SQL init/migration scripts.

## Configuration

Select the SQLite backend with `DB_TYPE=sqlite` when your deployment is wired to use this adapter. Configure the database file path through the SQLite settings used by your runtime environment, such as `SQLITE_PATH` where supported.

See the [Database Gateway documentation](/docs/gateways/db) for general gateway configuration details.
