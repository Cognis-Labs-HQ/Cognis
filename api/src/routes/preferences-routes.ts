import type { IncomingMessage, ServerResponse } from 'node:http';

export class UserPreferenceStore {
  private readonly data = new Map<string, string>();
  get(accountId: string, pageId: string) { return this.data.get(`${accountId}:${pageId}`) ?? null; }
  set(accountId: string, pageId: string, layoutJson: string) { this.data.set(`${accountId}:${pageId}`, layoutJson); }
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function createPreferencesRoutes(store: UserPreferenceStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const match = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/preferences\/([^/]+)$/);
    if (!match) return false;
    const accountId = decodeURIComponent(match[1]);
    const pageId = decodeURIComponent(match[2]);

    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { accountId, pageId, layoutJson: store.get(accountId, pageId) } }));
      return true;
    }

    if (req.method === 'PUT') {
      const body = await readJson(req);
      store.set(accountId, pageId, JSON.stringify(body.layout ?? {}));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { saved: true } }));
      return true;
    }

    return false;
  };
}
