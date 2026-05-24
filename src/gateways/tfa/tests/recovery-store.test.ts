import test from 'node:test';
import assert from 'node:assert/strict';
import { DbTfaStore } from '../reuse/tfa-store.js';
import { InMemoryTestExecutor } from '../../db/tests/in-memory-test-executor.js';

test('DbTfaStore.consumeRecoveryCode consumes a code only once', async () => {
  const db = new InMemoryTestExecutor();
  const store = new DbTfaStore(db);
  await store.ensureSchema();
  await store.replaceRecoveryCodes('alice', ['ABCD-1234']);

  assert.equal(await store.consumeRecoveryCode('alice', 'ABCD-1234'), true);
  assert.equal(await store.consumeRecoveryCode('alice', 'ABCD-1234'), false);
  assert.equal(await store.countUnusedRecoveryCodes('alice'), 0);
});
