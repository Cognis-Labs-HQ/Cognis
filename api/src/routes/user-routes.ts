import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LocalAccountStore } from '../adapters/local-auth-gateway.js';
import { requireAuth } from '../auth/guard.js';
import type { UserPreferenceStore } from './preferences-routes.js';

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function createUserRoutes(accountStore: LocalAccountStore, preferenceStore: UserPreferenceStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/users' && req.method === 'GET') {
      if (!requireAuth(req, res, 'admin')) return true;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: await accountStore.list() }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|preferences\/clear))?$/);
    if (!match) return false;
    if (!requireAuth(req, res, 'admin')) return true;

    const username = decodeURIComponent(match[1]);
    const action = match[2];

    if (req.method === 'POST' && !action) {
      const body = await readJson(req);
      const created = await accountStore.register(username, String(body.password ?? 'changeme'), String(body.role ?? 'user') === 'admin');
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: created }));
      return true;
    }

    if (req.method === 'POST' && action === 'role') {
      const body = await readJson(req);
      await accountStore.setRole(username, body.role);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'password') {
      const body = await readJson(req);
      await accountStore.setPassword(username, String(body.password ?? 'changeme'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'enable') {
      await accountStore.setEnabled(username, true);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'disable') {
      await accountStore.setEnabled(username, false);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'preferences/clear') {
      await preferenceStore.clearUser(username);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { cleared: true } }));
      return true;
    }

    if (req.method === 'DELETE' && !action) {
      await accountStore.delete(username);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { deleted: true } }));
      return true;
    }

    return false;
  };
}
