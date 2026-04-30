import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocsRoutes } from '../src/routes/docs-routes.js';

test('docs route handles docs index with tree paths', async () => {
  const route = createDocsRoutes();
  let status = 0;
  let body = '';
  const handled = await route({ method: 'GET' } as any, { writeHead(code: number) { status = code; }, end(payload: string) { body = payload; } } as any, new URL('http://localhost/api/v1/docs'));
  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.match(body, /ui\/mydoc/);
});

test('docs route supports tree-based slug lookup', async () => {
  const route = createDocsRoutes();
  let status = 0;
  let body = '';
  const handled = await route({ method: 'GET' } as any, { writeHead(code: number) { status = code; }, end(payload: string) { body = payload; } } as any, new URL('http://localhost/api/v1/docs/ui/mydoc'));
  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.match(body, /UI Module: MyDoc/);
});
