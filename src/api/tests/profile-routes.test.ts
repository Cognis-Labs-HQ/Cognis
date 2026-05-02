import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DbProfileStore } from '../adapters/db-profile-store.js';
import { DbLocalAccountStore, SqliteExecutor } from '../adapters/db-account-store.js';
import { createProfileRoutes } from '../routes/profile-routes.js';
import { issueAccessToken } from '../auth/access-tokens.js';

function makeTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cognis-profile-test-'));
  return { dir, executor: new SqliteExecutor(path.join(dir, 'test.sqlite')) };
}

function fakeFileGateway() {
  const store = new Map<string, Buffer>();
  return {
    async put(key: string, content: Uint8Array) {
      store.set(key, Buffer.from(content));
      return { key, size: content.length, lastModified: new Date() };
    },
    async get(key: string) { return store.get(key) ?? null; },
    async delete(key: string) { store.delete(key); return true; },
    async list() { return []; },
  };
}

function makeReq(method: string, token: string, body?: string) {
  const chunks = body ? [Buffer.from(body)] : [];
  return {
    method,
    headers: { authorization: `Bearer ${token}` },
    [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; },
  } as any;
}

test('profile routes - get own profile returns not_found when no profile exists', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    const token = issueAccessToken('alice', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    let body = '';
    await route(
      makeReq('GET', token),
      { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any,
      new URL('http://localhost/api/v1/profile')
    );
    assert.equal(status, 404);
    assert.match(body, /not_found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('profile routes - get own profile returns data after creation', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const accountStore = new DbLocalAccountStore(executor, 'sqlite');
    await accountStore.ensureSchema();
    await accountStore.register('alice', 'pw');
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    await profileStore.createProfile('alice', 'alice');
    const token = issueAccessToken('alice', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    let body = '';
    await route(
      makeReq('GET', token),
      { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any,
      new URL('http://localhost/api/v1/profile')
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.handle, 'alice');
    assert.equal(parsed.data.visibility, 'hidden');
    assert.equal(parsed.data.role, 'user');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('profile routes - PATCH updates bio and visibility', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const accountStore = new DbLocalAccountStore(executor, 'sqlite');
    await accountStore.ensureSchema();
    await accountStore.register('bob', 'pw');
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    await profileStore.createProfile('bob', 'bob');
    const token = issueAccessToken('bob', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    let body = '';
    await route(
      makeReq('PATCH', token, JSON.stringify({ bio: 'Hello world', visibility: 'community' })),
      { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any,
      new URL('http://localhost/api/v1/profile')
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.bio, 'Hello world');
    assert.equal(parsed.data.visibility, 'community');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('profile routes - PATCH rejects invalid visibility', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const accountStore = new DbLocalAccountStore(executor, 'sqlite');
    await accountStore.ensureSchema();
    await accountStore.register('carol', 'pw');
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    await profileStore.createProfile('carol', 'carol');
    const token = issueAccessToken('carol', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    await route(
      makeReq('PATCH', token, JSON.stringify({ visibility: 'public' })),
      { writeHead(c: number) { status = c; }, end() {} } as any,
      new URL('http://localhost/api/v1/profile')
    );
    assert.equal(status, 400);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('profile routes - hidden profile not visible to other users', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const accountStore = new DbLocalAccountStore(executor, 'sqlite');
    await accountStore.ensureSchema();
    await accountStore.register('dave', 'pw');
    await accountStore.register('eve', 'pw');
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    await profileStore.createProfile('dave', 'dave');
    const eveToken = issueAccessToken('eve', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    await route(
      makeReq('GET', eveToken),
      { writeHead(c: number) { status = c; }, end() {} } as any,
      new URL('http://localhost/api/v1/users/dave/profile')
    );
    assert.equal(status, 404);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('profile routes - community profile visible to other users', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const accountStore = new DbLocalAccountStore(executor, 'sqlite');
    await accountStore.ensureSchema();
    await accountStore.register('frank', 'pw');
    await accountStore.register('grace', 'pw');
    const profileStore = new DbProfileStore(executor, 'sqlite');
    await profileStore.ensureSchema();
    await profileStore.createProfile('frank', 'frank');
    await profileStore.updateProfile('frank', { visibility: 'community' });
    const graceToken = issueAccessToken('grace', 'user', 60);
    const route = createProfileRoutes(profileStore, fakeFileGateway());
    let status = 0;
    let body = '';
    await route(
      makeReq('GET', graceToken),
      { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any,
      new URL('http://localhost/api/v1/users/frank/profile')
    );
    assert.equal(status, 200);
    assert.match(body, /frank/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
