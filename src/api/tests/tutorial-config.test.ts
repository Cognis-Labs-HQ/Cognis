import test from 'node:test';
import assert from 'node:assert/strict';
import { createSystemRoutes } from '../routes/system-routes.js';
import { issueAccessToken } from '../auth/access-tokens.js';

const healthService = {
  status() {
    return { status: 'ok', timestamp: '2026-01-01T00:00:00.000Z', startedAt: '2026-01-01T00:00:00.000Z', uptimeMs: 1 };
  }
};

function makeRecorder() {
  let status = 0;
  let body = '';
  return {
    res: {
      setHeader() {},
      writeHead(code: number) { status = code; },
      end(payload?: string) { if (payload) body = payload; },
    },
    get status() { return status; },
    get body() { return body; },
  };
}

function requestWithBody(method: string, token: string | null, body: Record<string, unknown>) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return {
    method,
    headers,
    [Symbol.asyncIterator]: async function* () { for (const chunk of chunks) yield chunk; },
  } as any;
}

test('ui-config includes tutorialsEnabled defaulting to true', async () => {
  delete process.env.ALLOW_TUTORIALS;
  const route = createSystemRoutes(healthService as any);
  const rec = makeRecorder();
  await route({ method: 'GET', headers: {} } as any, rec.res as any, new URL('http://localhost/api/v1/system/ui-config'));
  assert.equal(rec.status, 200);
  assert.match(rec.body, /"tutorialsEnabled":true/);
});

test('ui-config returns tutorialsEnabled false when ALLOW_TUTORIALS=0', async () => {
  process.env.ALLOW_TUTORIALS = '0';
  const route = createSystemRoutes(healthService as any);
  const rec = makeRecorder();
  await route({ method: 'GET', headers: {} } as any, rec.res as any, new URL('http://localhost/api/v1/system/ui-config'));
  assert.equal(rec.status, 200);
  assert.match(rec.body, /"tutorialsEnabled":false/);
  delete process.env.ALLOW_TUTORIALS;
});

test('ui-config returns tutorialsEnabled false when ALLOW_TUTORIALS=false', async () => {
  process.env.ALLOW_TUTORIALS = 'false';
  const route = createSystemRoutes(healthService as any);
  const rec = makeRecorder();
  await route({ method: 'GET', headers: {} } as any, rec.res as any, new URL('http://localhost/api/v1/system/ui-config'));
  assert.equal(rec.status, 200);
  assert.match(rec.body, /"tutorialsEnabled":false/);
  delete process.env.ALLOW_TUTORIALS;
});

test('PUT /api/v1/system/config/tutorials requires admin auth', async () => {
  delete process.env.ALLOW_TUTORIALS;
  const route = createSystemRoutes(healthService as any);

  const anonRec = makeRecorder();
  const anonHandled = await route(
    { method: 'PUT', headers: {} } as any,
    anonRec.res as any,
    new URL('http://localhost/api/v1/system/config/tutorials')
  );
  assert.equal(anonHandled, true);
  assert.equal(anonRec.status, 401);

  const userToken = issueAccessToken('u1', 'user', 60);
  const userRec = makeRecorder();
  const userHandled = await route(
    { method: 'PUT', headers: { authorization: `Bearer ${userToken}` } } as any,
    userRec.res as any,
    new URL('http://localhost/api/v1/system/config/tutorials')
  );
  assert.equal(userHandled, true);
  assert.equal(userRec.status, 403);
});

test('admin can disable tutorials at runtime via PUT', async () => {
  delete process.env.ALLOW_TUTORIALS;
  const route = createSystemRoutes(healthService as any);
  const adminToken = issueAccessToken('admin1', 'admin', 60);

  const disableRec = makeRecorder();
  await route(
    requestWithBody('PUT', adminToken, { enabled: false }),
    disableRec.res as any,
    new URL('http://localhost/api/v1/system/config/tutorials')
  );
  assert.equal(disableRec.status, 200);
  assert.match(disableRec.body, /"tutorialsEnabled":false/);

  const configRec = makeRecorder();
  await route(
    { method: 'GET', headers: {} } as any,
    configRec.res as any,
    new URL('http://localhost/api/v1/system/ui-config')
  );
  assert.match(configRec.body, /"tutorialsEnabled":false/);
});

test('env kill switch prevents admin re-enabling tutorials', async () => {
  process.env.ALLOW_TUTORIALS = '0';
  const route = createSystemRoutes(healthService as any);
  const adminToken = issueAccessToken('admin1', 'admin', 60);

  const rec = makeRecorder();
  await route(
    requestWithBody('PUT', adminToken, { enabled: true }),
    rec.res as any,
    new URL('http://localhost/api/v1/system/config/tutorials')
  );
  assert.equal(rec.status, 403);
  assert.match(rec.body, /ALLOW_TUTORIALS/);

  delete process.env.ALLOW_TUTORIALS;
});

test('PUT /api/v1/system/config/tutorials rejects non-boolean enabled value', async () => {
  delete process.env.ALLOW_TUTORIALS;
  const route = createSystemRoutes(healthService as any);
  const adminToken = issueAccessToken('admin1', 'admin', 60);

  const rec = makeRecorder();
  await route(
    requestWithBody('PUT', adminToken, { enabled: 'yes' }),
    rec.res as any,
    new URL('http://localhost/api/v1/system/config/tutorials')
  );
  assert.equal(rec.status, 400);
});
