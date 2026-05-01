import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiRoutes } from '../src/routes/ui-routes.js';
import path from 'node:path';
import { issueAccessToken } from '../src/auth/access-tokens.js';

function createResponseRecorder() {
  let status = 0;
  let headers: Record<string, string> = {};
  const chunks: string[] = [];
  return {
    res: {
      setHeader() {},
      writeHead(code: number, nextHeaders: Record<string, string>) { status = code; headers = nextHeaders ?? {}; },
      end(body?: string | Buffer) { if (body) chunks.push(body.toString()); }
    },
    get status() { return status; },
    get headers() { return headers; },
    get body() { return chunks.join(''); }
  };
}

test('ui routes redirect root to dashboard', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  const handled = await route({ headers: {} } as any, recorder.res as any, new URL('http://localhost/'));

  assert.equal(handled, true);
  assert.equal(recorder.status, 302);
  assert.equal(recorder.headers.location, '/dashboard');
});

test('dashboard route requires login cookie', async () => {
  const route = createUiRoutes();
  const anonymous = createResponseRecorder();

  await route({ headers: {} } as any, anonymous.res as any, new URL('http://localhost/dashboard'));

  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.location, '/login');

  const token = issueAccessToken('u1', 'user', 60);
  const authed = createResponseRecorder();
  await route({ headers: { cookie: `cognis_access_token=${token}` } } as any, authed.res as any, new URL('http://localhost/dashboard'));

  assert.equal(authed.status, 200);
  assert.match(authed.body, /page-builder\.js/);
});

test('login page is served as standalone page html', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  await route({ headers: {} } as any, recorder.res as any, new URL('http://localhost/login'));

  assert.equal(recorder.status, 200);
  assert.match(recorder.body, /id="login-form"/);
  assert.match(recorder.body, /id="theme-toggle"/);
  assert.match(recorder.body, /app\/login\.js/);
});

test('ui static route serves templates and assets from public folder', async () => {
  const route = createUiRoutes();

  const templateRes = createResponseRecorder();
  await route({ headers: {} } as any, templateRes.res as any, new URL('http://localhost/dashboard/static/templates/dashboard-layout.html'));
  assert.equal(templateRes.status, 200);
  assert.match(templateRes.body, /topbar-icon/);

  const assetRes = createResponseRecorder();
  await route({ headers: {} } as any, assetRes.res as any, new URL('http://localhost/dashboard/static/assets/icons/cognis-icon.png'));
  assert.equal(assetRes.status, 200);
  assert.equal(assetRes.headers['content-type'], 'image/png');
});


test('modules page requires login and serves html when authenticated', async () => {
  const route = createUiRoutes();
  const anonymous = createResponseRecorder();
  await route({ headers: {} } as any, anonymous.res as any, new URL('http://localhost/modules'));
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.location, '/login');

  const token = issueAccessToken('u1', 'admin', 60);
  const authed = createResponseRecorder();
  await route({ headers: { cookie: `cognis_access_token=${token}` } } as any, authed.res as any, new URL('http://localhost/modules'));
  assert.equal(authed.status, 200);
  assert.match(authed.body, /app\/modules\.js/);
});


test('module ui routes can be published outside /modules prefix', async () => {
  const route = createUiRoutes({
    listManifests: async () => [{ id: 'sample-analytics', entrypoints: { ui: './ui/pages/analytics.html' } }]
  } as any);
  const token = issueAccessToken('u1', 'admin', 60);
  const recorder = createResponseRecorder();
  await route({ headers: { cookie: `cognis_access_token=${token}` } } as any, recorder.res as any, new URL('http://localhost/analytics'));
  assert.equal(recorder.status, 200);
  assert.match(recorder.body, /Sample Analytics Module/);
});
