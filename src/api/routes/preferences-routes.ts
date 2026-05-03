import { requireAuth } from '../auth/guard.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJson } from './read-json.js';

export interface UserPreferenceStore {
  get(accountId: string, pageId: string): Promise<string | null>;
  set(accountId: string, pageId: string, layoutJson: string): Promise<void>;
  clearUser(accountId: string): Promise<void>;
}

export class VolatileUserPreferenceStore implements UserPreferenceStore {
  private readonly data = new Map<string, string>();

  async get(accountId: string, pageId: string) {
    return this.data.get(`${accountId}:${pageId}`) ?? null;
  }

  async set(accountId: string, pageId: string, layoutJson: string) {
    this.data.set(`${accountId}:${pageId}`, layoutJson);
  }

  async clearUser(accountId: string) {
    for (const key of this.data.keys()) {
      if (key.startsWith(`${accountId}:`)) this.data.delete(key);
    }
  }
}

export function createPreferencesRoutes(store: UserPreferenceStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const match = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/preferences\/([^/]+)$/);
    if (!match) return false;
    const claims = requireAuth(req, res, 'user');
    if (!claims) return true;
    const accountId = decodeURIComponent(match[1]);
    if (claims.sub !== accountId && claims.role !== 'admin') {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Cannot access another user preferences' } }));
      return true;
    }
    const pageId = decodeURIComponent(match[2]);

    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { accountId, pageId, layoutJson: await store.get(accountId, pageId) } }));
      return true;
    }

    if (req.method === 'PUT') {
      const body = await readJson(req);
      await store.set(accountId, pageId, JSON.stringify(body.layout ?? {}));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { saved: true } }));
      return true;
    }

    return false;
  };
}
