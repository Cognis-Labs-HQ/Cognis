import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSqliteAuthSchema } from '../src/auth-schema.js';

test('sqlite auth schema applies all statements', async () => {
  const statements: string[] = [];
  const db = {
    query: async () => ({ rows: [], rowCount: 0 }),
    execute: async (statement: string) => {
      statements.push(statement);
      return { affectedRows: 0 };
    },
    transaction: async <T>(callback: (trx: typeof db) => Promise<T>) => callback(db)
  };

  await ensureSqliteAuthSchema(db);

  assert.equal(statements.length, 3);
  assert.match(statements[0] ?? '', /CREATE TABLE IF NOT EXISTS accounts/);
  assert.match(statements[2] ?? '', /local_auth_credentials/);
});
