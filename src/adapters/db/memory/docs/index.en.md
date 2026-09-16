# Memory Database Adapter

## Overview

The memory adapter is a no-op database implementation intended for use in automated tests and CI pipelines where a real database should not be involved. Every query returns an empty result set and every execute is a silent no-op. All SQL issued against the memory adapter is recorded in `queryLog`, making it easy to assert in tests that the expected SQL was generated.

The memory adapter should never be used in a production deployment.

## Responsibilities

- Implement the `DatabaseGateway` interface: `query`, `execute`, and `transaction`.
- Record every SQL statement and parameters in `queryLog`.
- Return an empty result set (`[]`) for all `query()` calls.
- Do nothing (return `{ rowsAffected: 0 }`) for all `execute()` calls.
- Execute the `transaction(fn)` callback without any real transaction semantics.

## Architecture

`MemoryDatabaseGateway` in `src/adapters/db/memory/adapter.ts` holds a single `queryLog: Array<{ sql: string; params: unknown[] }>` array. Both `query()` and `execute()` push a log entry and return immediately.

```ts
const db = new MemoryDatabaseGateway();
await db.execute("INSERT INTO users (id) VALUES (?)", ["u1"]);
console.log(db.queryLog);
// [{ sql: 'INSERT INTO users (id) VALUES (?)', params: ['u1'] }]
```

Because schema initialisation (`ensureSchema()`) runs on every startup, the memory adapter silently absorbs all `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` statements without error. Tests that call the memory adapter directly after gateway bootstrap can therefore inspect only the application-level queries that followed schema initialisation.

## Configuration

| Variable  | Default | Description                               |
| --------- | ------- | ----------------------------------------- |
| `DB_TYPE` | —       | Must be `memory` to activate this adapter |
