import test from 'node:test';
import assert from 'node:assert/strict';
import { createModuleRoutes } from '../src/routes/module-routes.js';
import { issueAccessToken } from '../src/auth/access-tokens.js';

test('module routes list modules', async () => {
  const route = createModuleRoutes({
    list: async () => [{ id: 'sample-analytics', version: '1.0.0', class: 'extension' }],
    enable: async () => ({ moduleId: 'x', enabled: true }),
    disable: async () => ({ moduleId: 'x', enabled: false })
  } as any);

  const token = issueAccessToken('u1', 'admin', 60);
  let status = 0; let body='';
  const handled = await route({ method: 'GET', headers: { authorization: `Bearer ${token}` } } as any, { writeHead(c:number){status=c;}, end(v:string){body=v;} } as any, new URL('http://localhost/api/v1/modules'));
  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.match(body, /sample-analytics/);
});
