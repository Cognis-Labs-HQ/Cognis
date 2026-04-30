import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiRoutes } from '../src/routes/ui-routes.js';
import { signJwt } from '../src/auth/jwt.js';

test('ui routes redirect root to dashboard', async () => {
  const route = createUiRoutes();
  let status = 0;
  let headers: Record<string, string> = {};

  const handled = await route({ headers: {} } as any, {
    writeHead(code: number, nextHeaders: Record<string, string>) { status = code; headers = nextHeaders; },
    end() {}
  } as any, new URL('http://localhost/'));

  assert.equal(handled, true);
  assert.equal(status, 302);
  assert.equal(headers.location, '/dashboard');
});

test('dashboard route requires login cookie', async () => {
  const route = createUiRoutes();
  let status = 0;
  let headers: Record<string, string> = {};

  await route({ headers: {} } as any, {
    writeHead(code: number, nextHeaders: Record<string, string>) { status = code; headers = nextHeaders; },
    end() {}
  } as any, new URL('http://localhost/dashboard'));

  assert.equal(status, 302);
  assert.equal(headers.location, '/login');

  const token = signJwt({ sub: 'u1', role: 'user', name: 'u1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 });
  let authedStatus = 0;
  await route({ headers: { cookie: `cognis_token=${token}` } } as any, {
    writeHead(code: number) { authedStatus = code; },
    end() {}
  } as any, new URL('http://localhost/dashboard'));

  assert.notEqual(authedStatus, 302);
});
