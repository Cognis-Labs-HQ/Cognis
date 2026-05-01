import test from 'node:test';
import assert from 'node:assert/strict';
import { createModuleExtensionRoutes } from '../src/routes/module-extension-routes.js';

test('module extension routes expose module API endpoints', async () => {
  const route = createModuleExtensionRoutes({
    listManifests: async () => [{ id: 'sample-analytics', entrypoints: { api: './api/index.js' } }]
  } as any);
  let status = 0; let body='';
  const handled = await route({ method: 'GET' } as any, { writeHead(c:number){status=c;}, end(v:string){body=v;} } as any, new URL('http://localhost/api/v1/modules/sample-analytics/metrics'));
  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.match(body, /visitors/);
});
