# Database Gateway

## Overview

The Database Gateway is the single point of access for all database operations in Cognis. It provides a uniform executor interface that hides the differences between PostgreSQL and MariaDB so that the rest of the application never needs to know which database is running. The gateway reads `DB_TYPE` from the environment, creates the appropriate executor, initialises the schema, and contributes the executor and dialect helpers to the capability store.

No component outside the database gateway tree — no route handler, no gateway bootstrap, no module — should obtain a database connection or call a driver directly. All database access goes through the `db:executor` capability or through the higher-level store abstractions in `src/adapters/db/reuse/`.

The gateway also contributes a `DbDialectHelper` as the `db:dialect` capability. The dialect helper exposes `upsert` and `insertIgnore` operations that automatically emit the correct SQL variant for the active database provider, eliminating per-dialect branching from application code.

## Responsibilities

- Read `DB_TYPE` and create the correct `DbExecutor` instance at bootstrap.
- Initialise the database schema by running SQL init and migration scripts from the active adapter's `sql/` directory.
- Contribute `db:executor`, `db:type`, and `db:dialect` to the capability store.
- Seed the `modules` table with the `cognis-core` module record.
- Register the `db` gateway in the gateway registry.

Not responsible for: defining application-level schemas (those live in adapter SQL files), caching query results, or managing connection pools beyond what the underlying driver provides.

## Architecture

### DatabaseGateway interface

The `DatabaseGateway` interface in `src/gateways/db/gateway.ts` is the contract that all DB adapter classes implement:

```ts
export interface DatabaseGateway {
    query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>>;
    execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }>;
    transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbExecutor and createDbExecutor

The internal `DbExecutor` abstraction in `src/gateways/db/reuse/db-executor.ts` is used by the gateway's store layer and by the auth gateway. The factory function `createDbExecutor(dbType)` in `src/gateways/db/executor.ts` selects and instantiates the right executor based on `DB_TYPE`:

- `postgresql` — `PostgresExecutor` using the `pg` driver; connection from `DATABASE_URL`.
- `mariadb` — `MariadbExecutor` using `mysql2/promise`; connection from `DATABASE_URL`.

### DbDialectHelper

`DbDialectHelper` contributed as `db:dialect` provides two methods:

```ts
export interface DbDialectHelper {
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

`upsert` emits `ON CONFLICT ... DO UPDATE SET` (PostgreSQL) or `ON DUPLICATE KEY UPDATE` (MariaDB). `insertIgnore` emits `ON CONFLICT DO NOTHING` (PostgreSQL) or `INSERT IGNORE` (MariaDB).

### Schema initialisation

`initializeDatabaseSchema` in `src/gateways/db/init.ts` scans the active adapter's `sql/init/` and `sql/migrate/` directories and executes the SQL files in order. This runs at every startup; init scripts use `CREATE TABLE IF NOT EXISTS` so they are safe to run repeatedly.

Key source locations:

| Path                                   | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `src/gateways/db/gateway.ts`           | `DatabaseGateway` interface                               |
| `src/gateways/db/executor.ts`          | `createDbExecutor`, `PostgresExecutor`, `MariadbExecutor` |
| `src/gateways/db/init.ts`              | `initializeDatabaseSchema`                                |
| `src/gateways/db/bootstrap.ts`         | Bootstrap entry point; `DbDialectHelper`                  |
| `src/gateways/db/reuse/db-executor.ts` | Abstract `DbExecutor` interface                           |

## Configuration

| Variable       | Default      | Description                                               |
| -------------- | ------------ | --------------------------------------------------------- |
| `DB_TYPE`      | `postgresql` | Database backend: `postgresql` or `mariadb`               |
| `DATABASE_URL` | —            | Connection string; required for `postgresql` or `mariadb` |
