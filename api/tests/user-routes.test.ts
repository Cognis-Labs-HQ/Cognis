import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { VolatileLocalAccountStore } from '../src/adapters/local-auth-gateway.js';
import { VolatileUserPreferenceStore } from '../src/routes/preferences-routes.js';
import { issueAccessToken } from '../src/auth/access-tokens.js';

const adminToken = issueAccessToken('admin', 'admin', 60);
const headers = { authorization: `Bearer ${adminToken}` };

test('user routes create/list/update lifecycle', async () => {
  const accounts = new VolatileLocalAccountStore();
  accounts.register('admin', 'x', true);
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
