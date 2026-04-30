import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiRoutes } from '../src/routes/ui-routes.js';
import { signJwt } from '../src/auth/jwt.js';

function createResponseRecorder() {
  let status = 0;
  let headers: Record<string, string> = {};
  let body: unknown;
  return {
    get status() { return status; },
    get headers() { return headers; },
    get body() { return body; },
    value: {
      setHeader() {},
      writeHead(code: number, nextHeaders: Record<string, string>) { status = code; headers = nextHeaders; },
      end(payload?: unknown) { body = payload; }
    }
  };
}

test('ui routes redirect root to dashboard', async () => {
  const route = createUiRoutes();
  const res = createResponseRecorder();

  const handled = await route({ headers: {} } as any, res.value as any, new URL('http://localhost/'));

  assert.equal(handled, true);
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/dashboard');
});

test('dashboard route requires login cookie', async () => {
  const route = createUiRoutes();
  const anon = createResponseRecorder();

  await route({ headers: {} } as any, anon.value as any, new URL('http://localhost/dashboard'));

  assert.equal(anon.status, 302);
  assert.equal(anon.headers.location, '/login');

  const token = signJwt({ sub: 'u1', role: 'user', name: 'u1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 });
  const authed = createResponseRecorder();

  await route({ headers: { cookie: `cognis_token=${token}` } } as any, authed.value as any, new URL('http://localhost/dashboard'));

  assert.equal(authed.status, 200);
  assert.match(String(authed.headers['content-type']), /text\/html/);
});

test('login route serves standalone login page', async () => {
  const route = createUiRoutes();
  const res = createResponseRecorder();

  const handled = await route({ headers: {} } as any, res.value as any, new URL('http://localhost/login'));

  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.match(String(res.headers['content-type']), /text\/html/);
  assert.match(String(res.body), /Cognis - Login/);
});

test('static public assets and templates are retrievable', async () => {
  const route = createUiRoutes();

  const iconRes = createResponseRecorder();
  const iconHandled = await route({ headers: {} } as any, iconRes.value as any, new URL('http://localhost/dashboard/static/public/assets/icons/cognis-icon.png'));
  assert.equal(iconHandled, true);
  assert.equal(iconRes.status, 200);
  assert.match(String(iconRes.headers['content-type']), /image\/png/);

  const templateRes = createResponseRecorder();
  const templateHandled = await route({ headers: {} } as any, templateRes.value as any, new URL('http://localhost/dashboard/static/public/templates/login.html'));
  assert.equal(templateHandled, true);
  assert.equal(templateRes.status, 200);
  assert.match(String(templateRes.headers['content-type']), /text\/html/);
  assert.match(String(templateRes.body), /id="login-form"/);
});
