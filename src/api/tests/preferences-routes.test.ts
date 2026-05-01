import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferencesRoutes, VolatileUserPreferenceStore } from '../routes/preferences-routes.js';
import { issueAccessToken } from '../auth/access-tokens.js';

test('preferences routes save and load layout preferences', async () => {
  const route = createPreferencesRoutes(new VolatileUserPreferenceStore());
  let body = '';
  const token = issueAccessToken('u1', 'user', 60);
  const reqHeaders = { authorization: `Bearer ${token}` };

  await route({ method: 'PUT', headers: reqHeaders, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"layout":{"a":1}}'); } } as any, {
    writeHead() {}, end(payload: string) { body = payload; }
  } as any, new URL('http://localhost/api/v1/users/u1/preferences/home'));
  assert.match(body, /"saved":true/);

  await route({ method: 'GET', headers: reqHeaders } as any, {
    writeHead() {}, end(payload: string) { body = payload; }
  } as any, new URL('http://localhost/api/v1/users/u1/preferences/home'));
  assert.match(body, /layoutJson/);
});
