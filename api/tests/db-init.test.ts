import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDbProviderDir } from '../src/bootstrap/db-init.js';

test('db init resolves supported providers', () => {
  assert.equal(resolveDbProviderDir('sqlite'), 'sqlite');
  assert.equal(resolveDbProviderDir('postgresql'), 'postgresql');
  assert.equal(resolveDbProviderDir('mariadb'), 'mariadb');
  assert.equal(resolveDbProviderDir('mysql'), 'mariadb');
});
