import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDatabaseGateway } from '../memory-db-gateway.js';

test('memory db gateway logs statements', async () => {
  const gateway = new MemoryDatabaseGateway();
  await gateway.query('SELECT 1');
  await gateway.execute('UPDATE x SET y = ?', [1]);
  assert.equal(gateway.getQueries().length, 2);
});
