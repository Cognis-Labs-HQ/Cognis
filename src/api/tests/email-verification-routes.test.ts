import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserRoutes } from '../routes/user-routes.js';
import { VolatileLocalAccountStore } from '../adapters/local-auth-gateway.js';
import { VolatileUserPreferenceStore } from '../routes/preferences-routes.js';
import { DbNotificationStore } from '../adapters/db/notification-store.js';
import { SqliteExecutor } from '../adapters/db/account-store.js';
import { TfaCodeService, InMemoryTfaStore } from '../utils/tfa-code.js';
import { VerifyTokenService, InMemoryVerifyTokenStore } from '../utils/verify-token.js';
import { issueAccessToken } from '../auth/access-tokens.js';

async function makeNotifStore(): Promise<DbNotificationStore> {
  const db = new SqliteExecutor(':memory:');
  const store = new DbNotificationStore(db, 'sqlite');
  await store.ensureSchema();
  return store;
}

function makeRequest(method: string, body: Record<string, unknown>, token: string) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  return {
    method,
    headers: { authorization: `Bearer ${token}` },
    [Symbol.asyncIterator]: async function* () { for (const chunk of chunks) yield chunk; },
  } as any;
}

function makeResponse() {
  let status = 0;
  let payload = '';
  return {
    writeHead(code: number) { status = code; },
    end(data: string) { payload = data; },
    get status() { return status; },
    get payload() { return payload; },
  } as any;
}

test('adding the first email auto-sets it as primary', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();

  const route = createUserRoutes(accounts, prefs, undefined, notifStore);
  const token = issueAccessToken('alice', 'user', 60);
  const res = makeResponse();

  await route(
    makeRequest('POST', { email: 'alice@example.com' }, token),
    res,
    new URL('http://localhost/api/v1/users/alice/emails'),
  );
  assert.equal(res.status, 201);

  const emails = await notifStore.getUserEmails('alice');
  assert.equal(emails.length, 1);
  assert.equal(emails[0].primary, true);
});

test('cannot delete primary email', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();
  await notifStore.addUserEmail('alice', 'alice@example.com');
  await notifStore.addUserEmail('alice', 'alt@example.com');

  const token = issueAccessToken('alice', 'user', 60);
  const route = createUserRoutes(accounts, prefs, undefined, notifStore);
  const res = makeResponse();

  await route(
    { method: 'DELETE', headers: { authorization: `Bearer ${token}` } } as any,
    res,
    new URL('http://localhost/api/v1/users/alice/emails/alice%40example.com'),
  );
  assert.equal(res.status, 409);
  const data = JSON.parse(res.payload);
  assert.equal(data.error.code, 'cannot_remove_primary_email');
});

test('email verification flow: issue code, verify, email becomes verified', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();

  const tfaService = new TfaCodeService(new InMemoryTfaStore());
  const token = issueAccessToken('alice', 'user', 60);

  const sentEmails: Array<{ to: string; code: string }> = [];
  const mockSmtpSender = {
    isConfigured: () => true,
    sendVerificationEmail: async (to: string, code: string) => { sentEmails.push({ to, code }); },
  } as any;

  const route = createUserRoutes(accounts, prefs, undefined, notifStore, tfaService, mockSmtpSender);

  const addRes = makeResponse();
  await route(
    makeRequest('POST', { email: 'alice@example.com' }, token),
    addRes,
    new URL('http://localhost/api/v1/users/alice/emails'),
  );
  assert.equal(addRes.status, 201);
  const addData = JSON.parse(addRes.payload);
  assert.equal(addData.data.pendingVerification, true);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'alice@example.com');

  const emailsBefore = await notifStore.getUserEmails('alice');
  assert.equal(emailsBefore[0].verified, false);

  const code = sentEmails[0].code;

  const verRes = makeResponse();
  await route(
    makeRequest('POST', { code }, token),
    verRes,
    new URL('http://localhost/api/v1/users/alice/emails/alice%40example.com/verify'),
  );
  assert.equal(verRes.status, 200);

  const emailsAfter = await notifStore.getUserEmails('alice');
  assert.equal(emailsAfter[0].verified, true);
});

test('email verification rejects wrong code with 422', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();
  await notifStore.addUserEmail('alice', 'alice@example.com');

  const tfaService = new TfaCodeService(new InMemoryTfaStore());
  tfaService.issue('alice:alice@example.com');

  const token = issueAccessToken('alice', 'user', 60);
  const route = createUserRoutes(accounts, prefs, undefined, notifStore, tfaService);
  const res = makeResponse();

  await route(
    makeRequest('POST', { code: '000000' }, token),
    res,
    new URL('http://localhost/api/v1/users/alice/emails/alice%40example.com/verify'),
  );
  assert.equal(res.status, 422);
});

test('link verification with valid token verifies email and returns HTML', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();
  await notifStore.addUserEmail('alice', 'alice@example.com');

  const verifyTokenService = new VerifyTokenService(new InMemoryVerifyTokenStore());
  const linkToken = verifyTokenService.issue('alice:alice@example.com');

  const route = createUserRoutes(accounts, prefs, undefined, notifStore, undefined, undefined, verifyTokenService, 'http://localhost');
  const res = makeResponse();

  await route(
    { method: 'GET', headers: {} } as any,
    res,
    new URL(`http://localhost/api/v1/users/alice/emails/alice%40example.com/verify?token=${linkToken}`),
  );
  assert.equal(res.status, 200);
  assert.ok(res.payload.includes('verified'));

  const emails = await notifStore.getUserEmails('alice');
  assert.equal(emails[0].verified, true);
});

test('link verification with invalid token returns 400 HTML', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();
  await notifStore.addUserEmail('alice', 'alice@example.com');

  const verifyTokenService = new VerifyTokenService(new InMemoryVerifyTokenStore());
  const route = createUserRoutes(accounts, prefs, undefined, notifStore, undefined, undefined, verifyTokenService);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: {} } as any,
    res,
    new URL('http://localhost/api/v1/users/alice/emails/alice%40example.com/verify?token=badtoken'),
  );
  assert.equal(res.status, 400);
  assert.ok(res.payload.includes('Invalid'));
});

test('link verification token cannot be reused', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();
  await notifStore.addUserEmail('alice', 'alice@example.com');

  const verifyTokenService = new VerifyTokenService(new InMemoryVerifyTokenStore());
  const linkToken = verifyTokenService.issue('alice:alice@example.com');

  const route = createUserRoutes(accounts, prefs, undefined, notifStore, undefined, undefined, verifyTokenService);

  const req = { method: 'GET', headers: {} } as any;
  const verifyUrl = new URL(`http://localhost/api/v1/users/alice/emails/alice%40example.com/verify?token=${linkToken}`);

  const first = makeResponse();
  await route(req, first, verifyUrl);
  assert.equal(first.status, 200);

  const second = makeResponse();
  await route(req, second, verifyUrl);
  assert.equal(second.status, 400);
});

test('add email issues both TFA code and verify token and includes link in email', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const notifStore = await makeNotifStore();

  const tfaService = new TfaCodeService(new InMemoryTfaStore());
  const verifyTokenService = new VerifyTokenService(new InMemoryVerifyTokenStore());
  const authToken = issueAccessToken('alice', 'user', 60);

  const sentEmails: Array<{ to: string; code: string; verifyUrl?: string }> = [];
  const mockSmtpSender = {
    isConfigured: () => true,
    sendVerificationEmail: async (to: string, code: string, verifyUrl?: string) => {
      sentEmails.push({ to, code, verifyUrl });
    },
  } as any;

  const route = createUserRoutes(accounts, prefs, undefined, notifStore, tfaService, mockSmtpSender, verifyTokenService, 'http://localhost');
  const res = makeResponse();

  await route(
    makeRequest('POST', { email: 'alice@example.com' }, authToken),
    res,
    new URL('http://localhost/api/v1/users/alice/emails'),
  );
  assert.equal(res.status, 201);
  assert.equal(sentEmails.length, 1);
  assert.ok(sentEmails[0].verifyUrl);
  assert.ok(sentEmails[0].verifyUrl!.includes('/verify?token='));
});
