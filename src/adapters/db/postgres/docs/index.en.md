# PostgreSQL Database Adapter

## Overview

The PostgreSQL adapter connects Cognis to a PostgreSQL database server. It uses the `pg` npm driver and is the recommended adapter for production deployments that require advanced SQL features, full-text search, or managed PostgreSQL services such as Amazon RDS, Google Cloud SQL, or Supabase. It is selected when `DB_TYPE=postgresql`.

## Responsibilities

- Implement the `DatabaseGateway` interface: `query`, `execute`, and `transaction`.
- Manage a PostgreSQL connection pool using the `DATABASE_URL` connection string.
- Provide `$1`, `$2`, … positional placeholder support consistent with the `pg` driver's parameter binding.
- Register adapter metadata with the database gateway.

Not responsible for: managing the database schema or migrations (each gateway runs `ensureSchema()` via the executor), selecting a schema search path (configure in the `DATABASE_URL` or via `search_path`), or TLS certificate verification (configured via the `pg` driver's `ssl` option or connection string parameters).

## Architecture

`PostgresDbGateway` in `src/adapters/db/postgres/index.ts` owns a `pg.Pool`. Ordinary queries use the pool directly. Transactions reserve one client for `BEGIN`, all callback statements, and `COMMIT` or `ROLLBACK`, then release it. The adapter registers pool drainage with the `system:lifecycle` ctx capability so termination stops accepting work before closing pooled connections.

### Placeholder syntax

PostgreSQL uses numbered `$N` placeholders rather than `?`. All SQL passed to this adapter must use this syntax:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

Use `DbDialectHelper.upsert()` and `DbDialectHelper.insertIgnore()` from `src/gateways/db/bootstrap.ts` to generate dialect-appropriate statements rather than writing raw `INSERT … ON CONFLICT DO UPDATE`.

## Configuration

| Variable                              | Default | Description                                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `DB_TYPE`                             | —       | Must be `postgresql` to activate this adapter                             |
| `DATABASE_URL`                        | —       | PostgreSQL connection URL, e.g. `postgresql://user:pass@host:5432/cognis` |
| `POSTGRES_POOL_MAX`                   | `10`    | Maximum pool size (1–100)                                                 |
| `POSTGRES_POOL_IDLE_TIMEOUT_MS`       | `30000` | Idle-client timeout in milliseconds (1,000–600,000)                       |
| `POSTGRES_POOL_CONNECTION_TIMEOUT_MS` | `5000`  | Connection timeout in milliseconds (100–120,000)                          |
| `POSTGRES_POOL_STATEMENT_TIMEOUT_MS`  | —       | Optional statement timeout in milliseconds (1–3,600,000)                  |
