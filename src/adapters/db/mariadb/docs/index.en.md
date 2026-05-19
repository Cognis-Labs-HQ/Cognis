# MariaDB Database Adapter

## Overview

The MariaDB adapter connects Cognis to a MariaDB (or MySQL) database server, making it suitable for multi-server or high-availability deployments. It uses the `mariadb` npm driver and connection pooling, and is selected when `DB_TYPE=mariadb`.

## Responsibilities

- Implement the `DatabaseGateway` interface: `query`, `execute`, and `transaction`.
- Manage a MariaDB connection pool using the `DATABASE_URL` connection string.
- Provide `?` positional placeholder support consistent with the MariaDB driver's parameter binding.
- Register adapter metadata with the database gateway.

Not responsible for: choosing the database or schema name (use the `DATABASE_URL` path component), running schema migrations, or managing TLS certificate verification (configured via the `DATABASE_URL` or driver options).

## Architecture

`MariaDbGateway` in `src/adapters/db/mariadb/adapter.ts` creates a connection pool on startup via `mariadb.createPool(connectionString)`. Every call to `query()` and `execute()` acquires a connection from the pool, runs the statement, and releases the connection back. `transaction(fn)` acquires a dedicated connection, calls `BEGIN`, invokes the callback, and commits or rolls back depending on whether the callback throws.

### Placeholder syntax

Use `?` positional placeholders:

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

Use `DbDialectHelper.upsert()` and `DbDialectHelper.insertIgnore()` from `src/gateways/db/bootstrap.ts` to generate dialect-appropriate statements rather than writing raw `INSERT … ON DUPLICATE KEY UPDATE`.

## Configuration

| Variable       | Default | Description                                                         |
| -------------- | ------- | ------------------------------------------------------------------- |
| `DB_TYPE`      | —       | Must be `mariadb` to activate this adapter                          |
| `DATABASE_URL` | —       | MariaDB connection URL, e.g. `mariadb://user:pass@host:3306/cognis` |
