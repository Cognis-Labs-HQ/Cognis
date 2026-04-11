import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocsRoutes } from '../src/routes/docs-routes.js';

test('docs route handles docs index', async () => {
  const route = createDocsRoutes();
  let status = 0;
  let body = '';

  const req = { method: 'GET' } as any;
  const res = {
    writeHead(code: number) { status = code; },
    end(payload: string) { body = payload; }
  } as any;

  const handled = await route(req, res, new URL('http://localhost/api/v1/docs'));
  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.match(body, /core/);
});
