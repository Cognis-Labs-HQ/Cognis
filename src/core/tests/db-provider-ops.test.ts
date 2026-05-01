import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteDbGateway } from '../../adapters/db-sqlite/src/sqlite-db-gateway.js';
import { PostgresDbGateway } from '../../adapters/db-postgres/src/postgres-db-gateway.js';
import { MariaDbGateway } from '../../adapters/db-mariadb/src/mariadb-db-gateway.js';
import { MemoryDatabaseGateway } from '../../adapters/db-memory/src/memory-db-gateway.js';

test('all supported db gateways simulate query/execute/transaction operations', async () => {
  const sqlite = new SqliteDbGateway({ all: async () => [{ ok: 1 }], run: async () => ({ changes: 1 }), exec: async () => {} });
  const postgres = new PostgresDbGateway({ query: async () => ({ rows: [{ ok: 1 }], rowCount: 1 }) });
  const mariadb = new MariaDbGateway({ query: async () => [[{ ok: 1 }], { affectedRows: 1 }], beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {} });
  const memory = new MemoryDatabaseGateway();

  for (const db of [sqlite, postgres, mariadb, memory]) {
    const q = await db.query('select 1');
    assert.ok(q.rowCount >= 0);
    const e = await db.execute('update test');
    assert.ok(e.affectedRows >= 0);
    const value = await db.transaction(async () => 'ok');
    assert.equal(value, 'ok');
  }
});
