import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthRoutes } from '../routes/auth-routes.js';
import { VolatileLocalAccountStore, LocalAuthGateway } from '../adapters/local-auth-gateway.js';

function requestWithBody(method: string, body: Record<string, unknown>) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  return { method, [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } } as any;
}

test('auth routes register and login via gateway', async () => {
  const accountStore = new VolatileLocalAccountStore();
  const gateway = new LocalAuthGateway(accountStore);
  const route = createAuthRoutes(gateway, accountStore);
  let status = 0;
  let payload = '';

  await route(requestWithBody('POST', { username: 'u1', password: 'p1' }), {
    writeHead(code: number) { status = code; }, end(text: string) { payload = text; }
  } as any, new URL('http://localhost/api/v1/auth/register'));
  assert.equal(status, 201);
  assert.match(payload, /"username":"u1"/);

  await route(requestWithBody('POST', { username: 'u1', password: 'p1' }), {
    writeHead(code: number) { status = code; }, end(text: string) { payload = text; }
  } as any, new URL('http://localhost/api/v1/auth/login'));
  assert.equal(status, 200);
  assert.match(payload, /"provider":"local"/);
});
