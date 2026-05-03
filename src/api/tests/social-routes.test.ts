import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DbProfileStore } from '../adapters/db/profile-store.js';
import { DbLocalAccountStore, SqliteExecutor } from '../adapters/db/account-store.js';
import { createSocialRoutes } from '../routes/social/index.js';
import { issueAccessToken } from '../auth/access-tokens.js';

function makeTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cognis-social-test-'));
  return { dir, executor: new SqliteExecutor(path.join(dir, 'test.sqlite')) };
}

function makeReq(method: string, token: string | null) {
  return {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    [Symbol.asyncIterator]: async function* () {},
  } as any;
}

async function setupUsers(executor: any, ...usernames: string[]) {
  const accountStore = new DbLocalAccountStore(executor, 'sqlite');
  await accountStore.ensureSchema();
  const profileStore = new DbProfileStore(executor, 'sqlite');
  await profileStore.ensureSchema();
  for (const username of usernames) {
    await accountStore.register(username, 'pw');
    await profileStore.createProfile(username, username);
  }
  return profileStore;
}

test('social routes - follow and unfollow', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob');
    await profileStore.updateProfile('bob', { visibility: 'community' });
    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    let status = 0;
    let body = '';

    await route(makeReq('POST', aliceToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/bob/follow'));
    assert.equal(status, 200);
    assert.match(body, /true/);
    assert.ok(await profileStore.isFollowing('alice', 'bob'));

    await route(makeReq('DELETE', aliceToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/bob/follow'));
    assert.equal(status, 200);
    assert.ok(!(await profileStore.isFollowing('alice', 'bob')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - cannot follow hidden user', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'hidden');
    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    let status = 0;

    await route(makeReq('POST', aliceToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/hidden/follow'));
    assert.equal(status, 404);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - cannot follow yourself', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice');
    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    let status = 0;

    await route(makeReq('POST', aliceToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/alice/follow'));
    assert.equal(status, 400);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - unauthenticated follow request returns 401', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob');
    await profileStore.updateProfile('bob', { visibility: 'community' });
    const route = createSocialRoutes(profileStore);
    let status = 0;

    await route(makeReq('POST', null), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/bob/follow'));
    assert.equal(status, 401);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - block removes follow and returns 404 for blocked user', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob');
    await profileStore.updateProfile('alice', { visibility: 'community' });
    await profileStore.updateProfile('bob', { visibility: 'community' });
    await profileStore.follow('bob', 'alice');

    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    const bobToken = issueAccessToken('bob', 'user', 60);
    let status = 0;

    await route(makeReq('POST', aliceToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/bob/block'));
    assert.equal(status, 200);
    assert.ok(!(await profileStore.isFollowing('bob', 'alice')));

    await route(makeReq('POST', bobToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/alice/follow'));
    assert.equal(status, 404);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - cannot block yourself', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice');
    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    let status = 0;

    await route(makeReq('POST', aliceToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/alice/block'));
    assert.equal(status, 400);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - unblock removes block', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob');
    await profileStore.updateProfile('alice', { visibility: 'community' });
    await profileStore.updateProfile('bob', { visibility: 'community' });
    await profileStore.block('alice', 'bob');

    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    const bobToken = issueAccessToken('bob', 'user', 60);
    let status = 0;
    let body = '';

    await route(makeReq('DELETE', aliceToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/bob/block'));
    assert.equal(status, 200);
    assert.match(body, /false/);

    await route(makeReq('POST', bobToken), { writeHead(c: number) { status = c; }, end() {} } as any, new URL('http://localhost/api/v1/users/alice/follow'));
    assert.equal(status, 200);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - get followers and following', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob', 'carol');
    await profileStore.updateProfile('alice', { visibility: 'community' });
    await profileStore.updateProfile('bob', { visibility: 'community' });
    await profileStore.updateProfile('carol', { visibility: 'community' });
    await profileStore.follow('bob', 'alice');
    await profileStore.follow('carol', 'alice');

    const route = createSocialRoutes(profileStore);
    const aliceToken = issueAccessToken('alice', 'user', 60);
    let status = 0;
    let body = '';

    await route(makeReq('GET', aliceToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/alice/followers'));
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.length, 2);

    await route(makeReq('GET', aliceToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/bob/following'));
    assert.equal(status, 200);
    const following = JSON.parse(body);
    assert.equal(following.data.length, 1);
    assert.equal(following.data[0].handle, 'alice');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('social routes - followers list is empty for friends-visibility account when requester is not a follower', async () => {
  const { dir, executor } = makeTempDb();
  try {
    const profileStore = await setupUsers(executor, 'alice', 'bob', 'carol');
    await profileStore.updateProfile('alice', { visibility: 'friends' });
    await profileStore.updateProfile('bob', { visibility: 'community' });
    await profileStore.follow('bob', 'alice');

    const route = createSocialRoutes(profileStore);
    const carolToken = issueAccessToken('carol', 'user', 60);
    let status = 0;
    let body = '';

    await route(makeReq('GET', carolToken), { writeHead(c: number) { status = c; }, end(p: string) { body = p; } } as any, new URL('http://localhost/api/v1/users/alice/followers'));
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
