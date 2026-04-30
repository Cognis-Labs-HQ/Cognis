import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthRoutes, LocalAuthStore } from '../src/routes/auth-routes.js';

function requestWithBody(method: string, path: string, body: Record<string, unknown>) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  return { method, [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; }, url: path } as any;
}

test('auth routes register and login flow', async () => {
  const route = createAuthRoutes(new LocalAuthStore());
  let status = 0;
  let payload = '';

  await route(requestWithBody('POST', '/api/v1/auth/register', { username: 'u1', password: 'p1' }), {
    writeHead(code: number) { status = code; }, end(text: string) { payload = text; }
  } as any, new URL('http://localhost/api/v1/auth/register'));
  assert.equal(status, 201);
  assert.match(payload, /"username":"u1"/);

  await route(requestWithBody('POST', '/api/v1/auth/login', { username: 'u1', password: 'p1' }), {
    writeHead(code: number) { status = code; }, end(text: string) { payload = text; }
  } as any, new URL('http://localhost/api/v1/auth/login'));
  assert.equal(status, 200);
  assert.match(payload, /"username":"u1"/);
});
