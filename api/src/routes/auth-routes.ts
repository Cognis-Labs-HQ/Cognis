import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

interface Account { username: string; passwordHash: string; isAdmin: boolean; }

export class LocalAuthStore {
  private readonly accounts = new Map<string, Account>();

  ensureDefaultAdmin() {
    if (this.accounts.has('admin')) return null;
    const password = randomBytes(12).toString('base64url');
    this.accounts.set('admin', { username: 'admin', passwordHash: hash(password), isAdmin: true });
    return { username: 'admin', password };
  }

  register(username: string, password: string, isAdmin = false) {
    if (this.accounts.has(username)) throw new Error('username_taken');
    this.accounts.set(username, { username, passwordHash: hash(password), isAdmin });
    return { username, isAdmin };
  }

  login(username: string, password: string) {
    const account = this.accounts.get(username);
    if (!account || account.passwordHash !== hash(password)) return null;
    return { username: account.username, isAdmin: account.isAdmin };
  }
}

function hash(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8') || '{}';
  return JSON.parse(text);
}

export function createAuthRoutes(store: LocalAuthStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await readJson(req);
      const username = String(body.username ?? '');
      const password = String(body.password ?? '');
      const result = store.register(username, password, Boolean(body.isAdmin));
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: result }));
      return true;
    }

    if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await readJson(req);
      const session = store.login(String(body.username ?? ''), String(body.password ?? ''));
      if (!session) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'invalid_credentials', message: 'Invalid username or password' } }));
        return true;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: session }));
      return true;
    }

    return false;
  };
}
