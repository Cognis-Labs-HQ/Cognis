# Database Schema Management

## Overview

Cognis uses a two-phase SQL-first schema management approach. Plain `.sql` files are the canonical source of truth for the database schema. Adapter `ensureSchema()` methods act as lightweight safety nets; they are idempotent and will be no-ops on a correctly initialised database.

## Directory layout

```
db/
  init/
    sqlite/        ← run once on fresh or existing databases (CREATE TABLE IF NOT EXISTS)
    postgresql/
    mariadb/
  migrate/
    sqlite/        ← run after init on every boot (ALTER TABLE IF NOT EXISTS, etc.)
    postgresql/
    mariadb/
```

## Boot sequence

`initializeDatabaseSchema()` in `src/api/bootstrap/db-init.ts` is called at the start of the application boot, **before any adapter is used**. It:

1. Reads all `.sql` files from `db/init/<provider>/`, sorted alphabetically.
2. Executes every statement in each file in order.
3. Reads all `.sql` files from `db/migrate/<provider>/`, sorted alphabetically.
4. Executes every statement in each file in order.

After this runs, every table and baseline seed row required by the application exists.

## File naming convention

Files are processed in lexicographic order, so use a numeric prefix to control ordering:

```
001_accounts.sql        ← core auth tables (no FK dependencies)
002_profile.sql         ← profile/social tables (depend on accounts)
003_notifications.sql   ← notification/email tables
004_system.sql          ← runtime system tables (modules, bootstrap state)
```

A new init file must be numbered higher than any existing file it depends on.

Migration files follow the same convention and are numbered sequentially across all releases.

## Authoring rules

- **Init files** must use `CREATE TABLE IF NOT EXISTS` for every table so they are safe to re-run against an existing database (e.g. after a restart).
- **Migration files** must use `IF NOT EXISTS` / `IF EXISTS` guards on every `ALTER TABLE` so they are safe to re-run against a database that already has the change applied.
- SQL files are split on the `;` character. **Do not include semicolons inside string literals** in these files.
- SQL comments (`--`) are supported and stripped by the execution logic.

## Adding a new table

1. Create (or extend) the appropriate init file in all three provider directories.
2. If the table needs to be back-filled onto an existing deployment, add a migration file numbered after the highest existing migration.
3. Keep the adapter `ensureSchema()` method in sync with the SQL file so it remains a valid no-op safety net.

## Provider-specific type mappings

| Concept       | SQLite       | PostgreSQL     | MariaDB           |
|---------------|--------------|----------------|-------------------|
| Boolean       | `INTEGER`    | `BOOLEAN`      | `TINYINT(1)`      |
| Auto-now ts   | `TEXT`       | `TIMESTAMPTZ`  | `TIMESTAMP … ON UPDATE CURRENT_TIMESTAMP` |
| Large text    | `TEXT`       | `TEXT`         | `LONGTEXT`        |
| Short key     | `TEXT`       | `VARCHAR(255)` | `VARCHAR(191)` (utf8mb4 index limit) |
