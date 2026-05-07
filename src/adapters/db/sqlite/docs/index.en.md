# SQLite Database Adapter

## Overview

The SQLite adapter provides a zero-dependency relational database for single-server Cognis deployments. It uses the `better-sqlite3`-compatible client (synchronous API, wrapped in async shims) to store all platform data in a single file on the local filesystem. SQLite requires no separate database server process and is the recommended starting point for small deployments, local development, and testing.

The adapter is selected when `DB_TYPE=sqlite`.

## Responsibilities

- Implement the `DatabaseGateway` interface: `query`, `execute`, and `transaction`.
- Open (and if necessary create) the SQLite database file at startup.
- Enable WAL mode and foreign key enforcement on every connection.
- Register adapter metadata with the database gateway.

Not responsible for: choosing the database file path (that comes from `SQLITE_PATH`), managing migrations (each gateway that creates a schema calls `ensureSchema()` on the executor), or pooling (SQLite is single-writer by design; WAL mode handles concurrent reads).

## Architecture

`SqliteDbGateway` in `src/adapters/db/sqlite/adapter.ts` wraps the `better-sqlite3` database handle. All reads and writes go through two internal methods — `runQuery` and `runExecute` — that map the generic `query(sql, params)` / `execute(sql, params)` calls onto the synchronous `better-sqlite3` API and wrap the result in Promises to match the async `DatabaseGateway` signature.

`transaction(fn)` uses the synchronous `db.transaction()` facility from `better-sqlite3`, running the callback within a database-level transaction and rolling back automatically on any thrown exception.

### Placeholder syntax

Use `?` positional placeholders:

```sql
SELECT * FROM users WHERE id = ?
```

Mismatch between the adapter's placeholder style and the SQL supplied to the executor will cause a runtime error. Use `DbDialectHelper` from `src/gateways/db/bootstrap.ts` to generate dialect-appropriate `upsert` and `insertIgnore` statements.

## Configuration

| Variable      | Default                | Description                                                       |
| ------------- | ---------------------- | ----------------------------------------------------------------- |
| `DB_TYPE`     | —                      | Must be `sqlite` to activate this adapter                         |
| `SQLITE_PATH` | `./data/cognis.sqlite` | Path to the SQLite database file; created automatically if absent |
