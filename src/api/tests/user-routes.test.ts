import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserRoutes } from '../routes/user-routes.js';
import { VolatileLocalAccountStore } from '../adapters/local-auth-gateway.js';
import { VolatileUserPreferenceStore } from '../routes/preferences-routes.js';
import { issueAccessToken } from '../auth/access-tokens.js';

const adminToken = issueAccessToken('admin', 'admin', 60);
const headers = { authorization: `Bearer ${adminToken}` };

test('user routes create/list/update lifecycle', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('admin', 'x', true);
  const prefs = new VolatileUserPreferenceStore();
  const route = createUserRoutes(accounts, prefs);
  let body = '';
  let status = 0;

  await route({ method: 'POST', headers, [Symbol.asyncIterator]: async function*(){ yield Buffer.from('{"password":"pw","role":"user"}'); } } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice'));
  assert.equal(status, 201);

  await route({ method: 'GET', headers } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users'));
  assert.equal(status, 200);
  assert.match(body, /alice/);

  await route({ method: 'POST', headers, [Symbol.asyncIterator]: async function*(){ yield Buffer.from('{"role":"admin"}'); } } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice/role'));
  assert.equal(status, 200);

  await route({ method: 'DELETE', headers } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice'));
  assert.equal(status, 200);
});

test('user info endpoint allows self-access and admin access, blocks others', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('alice', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const route = createUserRoutes(accounts, prefs);
  let body = '';
  let status = 0;

  const aliceToken = issueAccessToken('alice', 'user', 60);
  const aliceHeaders = { authorization: `Bearer ${aliceToken}` };
  const bobToken = issueAccessToken('bob', 'user', 60);
  const bobHeaders = { authorization: `Bearer ${bobToken}` };

  await route({ method: 'GET', headers: aliceHeaders } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice/info'));
  assert.equal(status, 200);
  assert.match(body, /alice/);

  await route({ method: 'GET', headers } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice/info'));
  assert.equal(status, 200);

  await route({ method: 'GET', headers: bobHeaders } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/alice/info'));
  assert.equal(status, 403);

  await route({ method: 'GET', headers: aliceHeaders } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/nonexistent/info'));
  assert.equal(status, 403);
});

test('getInfo endpoint returns lastLogin field', async () => {
  const accounts = new VolatileLocalAccountStore();
  await accounts.register('carol', 'pw', false);
  const prefs = new VolatileUserPreferenceStore();
  const route = createUserRoutes(accounts, prefs);
  let body = '';
  let status = 0;

  const carolToken = issueAccessToken('carol', 'user', 60);
  const carolHeaders = { authorization: `Bearer ${carolToken}` };

  await route({ method: 'GET', headers: carolHeaders } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/carol/info'));
  assert.equal(status, 200);
  const parsed = JSON.parse(body);
  assert.ok('lastLogin' in parsed.data, 'response should contain lastLogin field');
  assert.equal(parsed.data.lastLogin, null, 'lastLogin should be null before any login');

  await accounts.updateLastLogin('carol');

  await route({ method: 'GET', headers: carolHeaders } as any, { writeHead(c:number){status=c;}, end(p:string){body=p;} } as any, new URL('http://localhost/api/v1/users/carol/info'));
  const parsedAfter = JSON.parse(body);
  assert.notEqual(parsedAfter.data.lastLogin, null, 'lastLogin should be set after updateLastLogin');
});
