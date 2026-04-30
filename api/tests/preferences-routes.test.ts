import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferencesRoutes, UserPreferenceStore } from '../src/routes/preferences-routes.js';
import { signJwt } from '../src/auth/jwt.js';

test('preferences routes save and load layout preferences', async () => {
  const route = createPreferencesRoutes(new UserPreferenceStore());
  let body = '';
  const token = signJwt({ sub: 'u1', role: 'user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 });
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
