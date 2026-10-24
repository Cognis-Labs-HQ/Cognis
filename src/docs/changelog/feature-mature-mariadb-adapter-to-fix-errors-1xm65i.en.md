# Reliable MariaDB Startup

**Feature Branch:** feature-mature-mariadb-adapter-to-fix-errors-1xm65i

## MariaDB waits until ready

Cognis now retries transient MariaDB connection failures during a bounded startup window instead of failing migrations during database initialization. The deployment tracks the latest stable MariaDB container release, while its health check allows MariaDB a longer initialization period. New containers always generate a random root password and automatically upgrade the database system tables; deployments no longer accept a user-defined root password. MariaDB now emits indexable string types for foreign-key columns, and MariaDB and PostgreSQL schema repair preserves constraints and surfaces failed repairs. The internal notification schema now uses the portable `is_read` identifier so MariaDB does not interpret the read-state column as SQL syntax. MariaDB now treats every explicitly indexed text column as an indexable string and repairs previously created `TEXT` columns before creating their indexes, preventing oversized-key bootstrap failures. MariaDB also converts ISO 8601 values only for schema-declared timestamp columns, preventing invalid `DATETIME` registration values without altering text data. Raw-SQL schemas now receive the same protection: a rejected datetime command is retried once with normalized MariaDB temporal values. Removed standalone raw-SQL authentication schema executors for MariaDB, PostgreSQL, and SQLite. An architecture check now enforces that production code uses DB gateway wrappers and confines raw statement execution to the DB gateway and owning executor entry points.

## Commits

- [34bbe100](https://github.com/Cognis-Labs-HQ/Cognis/commit/34bbe10095d802269dd2beb66b3d30853b459063)
- [43d363ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d363ae93b555b6d4bbbc06177aa4c5474f9287)
- [09c787ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/09c787eebba30e4c38fda39b3f0bc60a76028f77)
- [fed2f599](https://github.com/Cognis-Labs-HQ/Cognis/commit/fed2f599a47a100cb3367a25fa637fa720679d76)
- [15ed1e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ed1e6e57bf03459e5b905598c9d8bab227fe2e)
- [3eb5682a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3eb5682a932b611ef3f65357c3d5523037ee7756)
- [31881fb2](https://github.com/Cognis-Labs-HQ/Cognis/commit/31881fb29340bac55ddc78eb149caeec13fa22ae)
