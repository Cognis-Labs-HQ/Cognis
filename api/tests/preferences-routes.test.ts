import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferencesRoutes, UserPreferenceStore } from '../src/routes/preferences-routes.js';

test('preferences routes save and load layout preferences', async () => {
  const route = createPreferencesRoutes(new UserPreferenceStore());
  let body = '';
  await route({ method: 'PUT', [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"layout":{"a":1}}'); } } as any, {
    writeHead() {}, end(payload: string) { body = payload; }
  } as any, new URL('http://localhost/api/v1/users/u1/preferences/home'));
  assert.match(body, /"saved":true/);

  await route({ method: 'GET' } as any, {
    writeHead() {}, end(payload: string) { body = payload; }
  } as any, new URL('http://localhost/api/v1/users/u1/preferences/home'));
  assert.match(body, /layoutJson/);
});
