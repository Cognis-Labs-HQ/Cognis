import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { InMemoryLocalAccountStore } from '../src/adapters/local-auth-gateway.js';
import { UserPreferenceStore } from '../src/routes/preferences-routes.js';
import { signJwt } from '../src/auth/jwt.js';

const adminToken = signJwt({ sub: 'admin', role: 'admin', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60 });
const headers = { authorization: `Bearer ${adminToken}` };

test('user routes create/list/update lifecycle', async () => {
  const accounts = new InMemoryLocalAccountStore();
  accounts.register('admin', 'x', true);
  const prefs = new UserPreferenceStore();
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
