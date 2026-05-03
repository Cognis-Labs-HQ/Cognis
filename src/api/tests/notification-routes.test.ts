import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationRoutes } from '../routes/notification-routes.js';
import { CoreNotificationGateway, VolatileNotificationPreferenceStore } from '../gateways/notification-gateway.js';
import { issueAccessToken } from '../auth/access-tokens.js';
import type { NotificationEnvelope, NotificationSender } from '@cognis/core';

function requestWithBody(method: string, body: Record<string, unknown>, token: string) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  return {
    method,
    headers: { authorization: `Bearer ${token}` },
    [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; },
  } as any;
}

function makeResponse() {
  let status = 0;
  let payload = '';
  return {
    writeHead(code: number) { status = code; },
    end(p: string) { payload = p; },
    get status() { return status; },
    get payload() { return payload; },
  } as any;
}

class CapturingSender implements NotificationSender {
  readonly senderId: string;
  readonly received: NotificationEnvelope[] = [];

  constructor(id: string) { this.senderId = id; }

  async send(envelope: NotificationEnvelope): Promise<void> {
    this.received.push(envelope);
  }
}

test('notification route dispatches to registered sender when prefs match', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  prefStore.set('alice', 'account_alert', ['test-sender']);

  const sender = new CapturingSender('test-sender');
  const gateway = new CoreNotificationGateway(prefStore);
  gateway.registerSender(sender);

  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    requestWithBody('POST', {
      category: 'account_alert',
      recipientUsername: 'alice',
      recipientEmail: 'alice@example.com',
      subject: 'Hello',
      body: 'Test message',
    }, adminToken),
    res,
    new URL('http://localhost/api/v1/notifications/send')
  );

  assert.equal(res.status, 200);
  const data = JSON.parse(res.payload);
  assert.deepEqual(data.data.dispatched, ['test-sender']);
  assert.equal(sender.received.length, 1);
  assert.equal(sender.received[0].recipientUsername, 'alice');
  assert.equal(sender.received[0].category, 'account_alert');
  assert.equal(sender.received[0].subject, 'Hello');
});

test('notification route returns empty dispatched array when no prefs configured', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);

  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    requestWithBody('POST', {
      category: 'system_alert',
      recipientUsername: 'bob',
      subject: 'Alert',
      body: 'Something happened',
    }, adminToken),
    res,
    new URL('http://localhost/api/v1/notifications/send')
  );

  assert.equal(res.status, 200);
  const data = JSON.parse(res.payload);
  assert.deepEqual(data.data.dispatched, []);
});

test('notification route returns 400 when required fields are missing', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    requestWithBody('POST', { category: 'account_alert' }, adminToken),
    res,
    new URL('http://localhost/api/v1/notifications/send')
  );

  assert.equal(res.status, 400);
  assert.match(res.payload, /missing_fields/);
});

test('notification route returns 401 without authentication', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  let status = 0;

  await route(
    { method: 'POST', headers: {}, [Symbol.asyncIterator]: async function* () {} } as any,
    { writeHead(c: number) { status = c; }, end() {} } as any,
    new URL('http://localhost/api/v1/notifications/send')
  );

  assert.equal(status, 401);
});

test('notification route returns 403 for non-admin users', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const userToken = issueAccessToken('alice', 'user', 60);
  let status = 0;

  await route(
    requestWithBody('POST', {
      category: 'account_alert',
      recipientUsername: 'alice',
      subject: 'Hi',
      body: 'Test',
    }, userToken),
    { writeHead(c: number) { status = c; }, end() {} } as any,
    new URL('http://localhost/api/v1/notifications/send')
  );

  assert.equal(status, 403);
});

test('notification route does not handle unrelated paths', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);

  const handled = await route(
    { method: 'GET', headers: { authorization: `Bearer ${adminToken}` } } as any,
    { writeHead() {}, end() {} } as any,
    new URL('http://localhost/api/v1/other')
  );

  assert.equal(handled, false);
});

test('GET /api/v1/notifications/providers returns sender list to admin', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  gateway.registerSender(new CapturingSender('smtp'));
  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: { authorization: `Bearer ${adminToken}` }, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/notifications/providers')
  );

  assert.equal(res.status, 200);
  const data = JSON.parse(res.payload);
  assert.ok(Array.isArray(data.data));
  assert.equal(data.data.length, 1);
  assert.equal(data.data[0].senderId, 'smtp');
});

test('GET /api/v1/notifications/providers returns 401 without auth', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: {}, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/notifications/providers')
  );

  assert.equal(res.status, 401);
});

test('GET /api/v1/notifications/categories returns categories to authenticated user', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  gateway.registerCategory('system', 'System');
  const route = createNotificationRoutes(gateway);
  const userToken = issueAccessToken('alice', 'user', 60);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: { authorization: `Bearer ${userToken}` }, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/notifications/categories')
  );

  assert.equal(res.status, 200);
  const data = JSON.parse(res.payload);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.some((c: { id: string }) => c.id === 'system'));
});

test('GET /api/v1/notifications/categories returns 401 without auth', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: {}, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/notifications/categories')
  );

  assert.equal(res.status, 401);
});

test('GET /api/v1/notifications/providers/:id/config returns 404 for unknown sender', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: { authorization: `Bearer ${adminToken}` }, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/notifications/providers/unknown/config')
  );

  assert.equal(res.status, 404);
});

test('POST /api/v1/notifications/providers/:id/test returns 400 when sender has no sendTestEmail', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  gateway.registerSender(new CapturingSender('smtp'));
  const route = createNotificationRoutes(gateway);
  const adminToken = issueAccessToken('admin', 'admin', 60);
  const res = makeResponse();

  await route(
    requestWithBody('POST', { to: 'test@example.com' }, adminToken),
    res,
    new URL('http://localhost/api/v1/notifications/providers/smtp/test')
  );

  assert.equal(res.status, 400);
  assert.match(res.payload, /not_supported/);
});

test('GET /api/v1/users/:username/notification-prefs returns 401 without auth', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: {}, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/users/alice/notification-prefs')
  );

  assert.equal(res.status, 401);
});

test('GET /api/v1/users/:username/notification-prefs returns 403 for different user', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const userToken = issueAccessToken('bob', 'user', 60);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: { authorization: `Bearer ${userToken}` }, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/users/alice/notification-prefs')
  );

  assert.equal(res.status, 403);
});

test('GET /api/v1/users/:username/notification-prefs returns empty array without notifStore', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const userToken = issueAccessToken('alice', 'user', 60);
  const res = makeResponse();

  await route(
    { method: 'GET', headers: { authorization: `Bearer ${userToken}` }, [Symbol.asyncIterator]: async function* () {} } as any,
    res,
    new URL('http://localhost/api/v1/users/alice/notification-prefs')
  );

  assert.equal(res.status, 200);
  const data = JSON.parse(res.payload);
  assert.deepEqual(data.data, []);
});

test('PUT /api/v1/users/:username/notification-prefs returns 200 without notifStore', async () => {
  const prefStore = new VolatileNotificationPreferenceStore();
  const gateway = new CoreNotificationGateway(prefStore);
  const route = createNotificationRoutes(gateway);
  const userToken = issueAccessToken('alice', 'user', 60);
  const res = makeResponse();

  await route(
    requestWithBody('PUT', [{ category: 'system', senderId: 'smtp', enabled: true }], userToken),
    res,
    new URL('http://localhost/api/v1/users/alice/notification-prefs')
  );

  assert.equal(res.status, 200);
});

