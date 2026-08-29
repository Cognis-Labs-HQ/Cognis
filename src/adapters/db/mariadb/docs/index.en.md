# MariaDB Database Adapter

## Overview

The MariaDB adapter connects Cognis to a MariaDB (or MySQL) database server, making it suitable for multi-server or high-availability deployments. It uses the `mysql2` npm driver and connection pooling, and is selected when `DB_TYPE=mariadb`.

## Responsibilities

- Implement the `DatabaseGateway` interface: `query`, `execute`, and `transaction`.
- Manage a MariaDB connection pool using the `DATABASE_URL` connection string.
- Provide `?` positional placeholder support consistent with the MariaDB driver's parameter binding.
- Register adapter metadata with the database gateway.

Not responsible for: choosing the database or schema name (use the `DATABASE_URL` path component), running schema migrations, or managing TLS certificate verification (configured via the `DATABASE_URL` or driver options).

## Architecture

`MariaDbGateway` in `src/adapters/db/mariadb/index.ts` owns a `mysql2` promise pool. Ordinary queries execute directly through the pool. Transactions reserve one connection for the callback, commit or roll back on that connection, and release it in a `finally` block. The adapter registers pool drainage with the `system:lifecycle` ctx capability.

The adapter checks database readiness before exposing its executor. Transient network failures are retried within a bounded startup window, while authentication and configuration failures fail immediately.

Schema self-healing preserves foreign-key clauses when adding missing columns and reports index or column repair failures instead of silently ignoring them. Explicitly indexed text columns use `VARCHAR(255)`; self-healing converts an existing `TEXT` column before creating its index.
ISO 8601 values supplied for declared timestamp columns are converted to MariaDB `DATETIME` input syntax without changing ISO-like values stored in text columns.

### Placeholder syntax

Use `?` positional placeholders:

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

Use `DbDialectHelper.upsert()` and `DbDialectHelper.insertIgnore()` from `src/gateways/db/bootstrap.ts` to generate dialect-appropriate statements rather than writing raw `INSERT … ON DUPLICATE KEY UPDATE`.

## Configuration

| Variable                             | Default | Description                                                         |
| ------------------------------------ | ------- | ------------------------------------------------------------------- |
| `DB_TYPE`                            | —       | Must be `mariadb` to activate this adapter                          |
| `DATABASE_URL`                       | —       | MariaDB connection URL, e.g. `mariadb://user:pass@host:3306/cognis` |
| `MARIADB_POOL_MAX`                   | `10`    | Maximum pool size (1–100)                                           |
| `MARIADB_POOL_IDLE_TIMEOUT_MS`       | `30000` | Idle-connection timeout in milliseconds (1,000–600,000)             |
| `MARIADB_POOL_CONNECTION_TIMEOUT_MS` | `5000`  | Connection timeout in milliseconds (100–120,000)                    |
| `MARIADB_STARTUP_TIMEOUT_MS`         | `60000` | Maximum startup readiness window in milliseconds (1,000–600,000)    |
| `MARIADB_STARTUP_RETRY_INTERVAL_MS`  | `1000`  | Delay between readiness attempts in milliseconds (100–30,000)       |
