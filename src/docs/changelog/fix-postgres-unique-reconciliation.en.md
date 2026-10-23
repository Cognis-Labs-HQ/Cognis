# PostgreSQL Unique Keys

**Feature Branch:** fix-postgres-unique-reconciliation

## Unique-key reconciliation

PostgreSQL `ensureTable()` reconciles column `unique: true` and composite `uniqueKeys` declarations on existing tables as well as new tables. It recognizes valid, immediate, non-partial unique indexes by their key columns and creates only missing indexes. Nullable unique columns retain PostgreSQL’s default behavior: multiple NULL values are allowed. Existing primary keys are not replaced.

Schema initialization runs in a transaction with a per-table advisory lock, including when called inside an existing executor transaction. Duplicate values or conflicting index names fail initialization and roll back schema changes; no records are deleted or reassigned. Failures are logged by the transaction boundary.

## Commits

- [74a33d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/74a33d36a60b53bb8258d827e484ab39651a27ed)
