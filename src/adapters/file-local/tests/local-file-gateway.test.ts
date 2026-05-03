import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFileGateway } from '../local-file-gateway.js';

test('local file gateway put/get/delete', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cognis-files-'));
  try {
    const gateway = new LocalFileGateway(root);
    await gateway.put('avatars/u1.txt', Buffer.from('abc'));
    const content = await gateway.get('avatars/u1.txt');
    assert.equal(Buffer.from(content ?? []).toString('utf8'), 'abc');
    const removed = await gateway.delete('avatars/u1.txt');
    assert.equal(removed, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local file gateway store generates unique user-scoped keys', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cognis-files-'));
  try {
    const gateway = new LocalFileGateway(root);
    const result = await gateway.store('user1', Buffer.from('img data'), 'image/png');
    assert.match(result.key, /^user1\/[0-9a-f-]+\.png$/);
    const content = await gateway.get(result.key);
    assert.equal(Buffer.from(content ?? []).toString('utf8'), 'img data');

    const result2 = await gateway.store('user1', Buffer.from('more data'), 'image/png');
    assert.notEqual(result.key, result2.key);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
