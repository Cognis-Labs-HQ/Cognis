import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteDbGateway, type SqliteClient } from '../sqlite-db-gateway.js';

test('sqlite adapter runs query and transaction', async () => {
  const execCalls: string[] = [];
  const client: SqliteClient = {
    async all() { return [{ id: 1 }]; },
    async run() { return { changes: 1 }; },
    async exec(statement: string) { execCalls.push(statement); }
  };

  const gateway = new SqliteDbGateway(client);
  const rows = await gateway.query('select * from t');
  assert.equal(rows.rowCount, 1);
  await gateway.transaction(async () => undefined);
  assert.deepEqual(execCalls, ['BEGIN', 'COMMIT']);
});
