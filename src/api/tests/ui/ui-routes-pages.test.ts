import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiRoutes } from '../../routes/ui/index.js';
import {
  issueAccessToken,
  lookupAccessToken,
  revokeAccessTokensForSubject,
} from '../../../gateways/auth/access-tokens.js';
import { createResponseRecorder } from './ui-routes-test-helpers.js';

test('ui routes redirect root to dashboard', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  const handled = await route(
    { headers: {} } as any,
    recorder.res as any,
    new URL('http://localhost/'),
  );

  assert.equal(handled, true);
  assert.equal(recorder.status, 302);
  assert.equal(recorder.headers.location, '/dashboard');
});

test('ui routes use provided status code when redirecting unknown non-api GET paths', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  const handled = await route(
    {
      method: 'GET',
      headers: {},
    } as any,
    recorder.res as any,
    new URL('http://localhost/unknown-page?code=502'),
  );

  assert.equal(handled, true);
  assert.equal(recorder.status, 302);
  assert.equal(recorder.headers.location, '/error?code=502');
});

test('dashboard route requires login cookie', async () => {
  const route = createUiRoutes();
  const anonymous = createResponseRecorder();

  await route(
    { headers: {} } as any,
    anonymous.res as any,
    new URL('http://localhost/dashboard'),
  );

  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.location, '/login');

  const token = issueAccessToken('u1', 'user', 60);
  const authed = createResponseRecorder();
  await route(
    { headers: { cookie: `cognis_access_token=${token}` } } as any,
    authed.res as any,
    new URL('http://localhost/dashboard'),
  );

  assert.equal(authed.status, 200);
  assert.match(authed.body, /static\/app\/dashboard\/index\.js/);
});

test('dashboard route redirects missing-account sessions with account_deleted reason', async () => {
  const token = issueAccessToken('missing-user', 'user', 60);
  const route = createUiRoutes(undefined, undefined, {
    async getInfo() {
      return null;
    },
  } as any);
  const recorder = createResponseRecorder();

  await route(
    {
      headers: { cookie: `cognis_access_token=${token}` },
    } as any,
    recorder.res as any,
    new URL('http://localhost/dashboard'),
  );

  assert.equal(recorder.status, 302);
  assert.equal(recorder.headers.location, '/login?reason=account_deleted');
});

test('dashboard route redirects revoked disabled-account sessions with account_disabled reason', async () => {
  const disabledToken = issueAccessToken('disabled-user', 'user', 60);
  revokeAccessTokensForSubject('disabled-user');
  const route = createUiRoutes(undefined, undefined, {
    async getInfo(username: string) {
      if (username !== 'disabled-user') return null;
      return { enabled: false };
    },
  } as any);
  const recorder = createResponseRecorder();

  await route(
    {
      headers: { cookie: `cognis_access_token=${disabledToken}` },
    } as any,
    recorder.res as any,
    new URL('http://localhost/dashboard'),
  );

  assert.equal(recorder.status, 302);
  assert.equal(recorder.headers.location, '/login?reason=account_disabled');
});

test('login page serves html for authenticated sessions', async () => {
  const route = createUiRoutes();
  const token = issueAccessToken('u1', 'user', 60);
  const recorder = createResponseRecorder();

  await route(
    { headers: { cookie: `cognis_access_token=${token}` } } as any,
    recorder.res as any,
    new URL('http://localhost/login'),
  );

  assert.equal(recorder.status, 200);
  assert.match(recorder.body, /id="app"/);
  assert.match(recorder.body, /app\/login\/index\.js/);
});

test('login page serves html for revoked cookie tokens', async () => {
  const route = createUiRoutes();
  const token = issueAccessToken('u2', 'user', 60);
  revokeAccessTokensForSubject('u2');
  assert.equal(lookupAccessToken(token)?.revoked, true);
  const recorder = createResponseRecorder();

  await route(
    { headers: { cookie: `cognis_access_token=${token}` } } as any,
    recorder.res as any,
    new URL('http://localhost/login'),
  );

  assert.equal(recorder.status, 200);
  assert.match(recorder.body, /id="app"/);
  assert.match(recorder.body, /app\/login\/index\.js/);
});

test('login page is served as standalone page html', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  await route(
    { headers: {} } as any,
    recorder.res as any,
    new URL('http://localhost/login'),
  );

  assert.equal(recorder.status, 200);
  assert.match(recorder.body, /id="app"/);
  assert.match(recorder.body, /app\/login\/index\.js/);
});

test('ui static route serves templates and assets from public folder', async () => {
  const route = createUiRoutes();

  const templateRes = createResponseRecorder();
  await route(
    { headers: {} } as any,
    templateRes.res as any,
    new URL('http://localhost/static/templates/dashboard-layout.html'),
  );
  assert.equal(templateRes.status, 200);
  assert.match(templateRes.body, /topbar-icon/);

  const assetRes = createResponseRecorder();
  await route(
    { headers: {} } as any,
    assetRes.res as any,
    new URL('http://localhost/static/assets/icons/cognis-icon.png'),
  );
  assert.equal(assetRes.status, 200);
  assert.equal(assetRes.headers['content-type'], 'image/png');
});

test('ui routes serve public assets directly from /assets', async () => {
  const route = createUiRoutes();

  const assetRes = createResponseRecorder();
  await route(
    { headers: {} } as any,
    assetRes.res as any,
    new URL('http://localhost/assets/icons/cognis-icon.png'),
  );

  assert.equal(assetRes.status, 200);
  assert.equal(assetRes.headers['content-type'], 'image/png');
});

test('core ui routes do not serve /profile (owned by profile gateway)', async () => {
  const route = createUiRoutes();

  const anonymous = createResponseRecorder();
  const handled = await route(
    { headers: {} } as any,
    anonymous.res as any,
    new URL('http://localhost/profile/u1'),
  );
  assert.equal(
    handled,
    false,
    '/profile route should not be handled by core UI routes',
  );
});

test('license route requires login cookie and serves dedicated page', async () => {
  const route = createUiRoutes();
  const anonymous = createResponseRecorder();
  await route(
    { headers: {} } as any,
    anonymous.res as any,
    new URL('http://localhost/license'),
  );
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.location, '/login');

  const token = issueAccessToken('u1', 'user', 60);
  const authed = createResponseRecorder();
  await route(
    { headers: { cookie: `cognis_access_token=${token}` } } as any,
    authed.res as any,
    new URL('http://localhost/license'),
  );
  assert.equal(authed.status, 200);
  assert.match(authed.body, /static\/app\/license\/index\.js/);
  assert.match(authed.body, /id="app"/);
});

test('changelogs route requires login cookie and serves changelog entrypoint from docs boilerplate', async () => {
  const route = createUiRoutes();
  const anonymous = createResponseRecorder();
  await route(
    { headers: {} } as any,
    anonymous.res as any,
    new URL('http://localhost/changelogs'),
  );
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.location, '/login');

  const token = issueAccessToken('u1', 'user', 60);
  const authed = createResponseRecorder();
  await route(
    { headers: { cookie: `cognis_access_token=${token}` } } as any,
    authed.res as any,
    new URL('http://localhost/changelogs'),
  );
  assert.equal(authed.status, 200);
  assert.match(authed.body, /static\/app\/changelogs\/index\.js/);
  assert.match(authed.body, /{{ui\.page\.title\.changelogs}}/);
  assert.match(authed.body, /id="app"/);
});

test('manifest.webmanifest is served unauthenticated with PWA mime type', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  const handled = await route(
    { method: 'GET', headers: {} } as any,
    recorder.res as any,
    new URL('http://localhost/manifest.webmanifest'),
  );

  assert.equal(handled, true);
  assert.equal(recorder.status, 200);
  assert.equal(
    recorder.headers['content-type'],
    'application/manifest+json; charset=utf-8',
  );
  const parsed = JSON.parse(recorder.body);
  assert.equal(parsed.name, 'Cognis');
  assert.equal(parsed.start_url, '/dashboard');
  assert.equal(parsed.scope, '/');
  assert.equal(parsed.display, 'standalone');
  const sizes = parsed.icons.map((icon: any) => icon.sizes);
  assert.ok(sizes.includes('192x192'));
  assert.ok(sizes.includes('512x512'));
  const purposes = parsed.icons.map((icon: any) => icon.purpose);
  assert.ok(purposes.includes('maskable'));
});

test('/sw.js is served unauthenticated with root scope header', async () => {
  const route = createUiRoutes();
  const recorder = createResponseRecorder();

  const handled = await route(
    { method: 'GET', headers: {} } as any,
    recorder.res as any,
    new URL('http://localhost/sw.js'),
  );

  assert.equal(handled, true);
  assert.equal(recorder.status, 200);
  assert.equal(
    recorder.headers['content-type'],
    'text/javascript; charset=utf-8',
  );
  assert.equal(recorder.headers['service-worker-allowed'], '/');
  assert.match(recorder.body, /addEventListener\(['"]install['"]/);
  assert.match(recorder.body, /addEventListener\(['"]fetch['"]/);
});
