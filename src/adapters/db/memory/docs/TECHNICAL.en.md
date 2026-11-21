# Technical Reference

A non-persistent database test double that records calls without executing SQL.

## Interfaces

`MemoryDatabaseGateway` implements query, execute, transaction and getQueries in `src/adapters/db/memory/index.ts`. getQueries returns readonly records with statement and optional params.

## Configuration

Instantiate the class in a test harness. It exports neither canHandleDbProvider nor createDbExecutor, so setting DB_TYPE=memory does not integrate it with the standard executor loader.

## Behavior

query records the call and returns `{ rows: [], rowCount: 0 }`. execute records it and returns `{ affectedRows: 0 }`. transaction invokes the callback with the same instance, without SQL BEGIN, rollback or persisted rows.

## Security

Recorded parameters may include test secrets. Use synthetic values; this test double supplies no authentication or SQL authorization.

## Reference

Use a real database provider to verify persistence, constraints or isolation. See [Database](/docs/gateways/db/technical).
