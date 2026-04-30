import { signJwt } from '../auth/jwt.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthGateway } from '@cognis/core';
import type { LocalAccountStore } from '../adapters/local-auth-gateway.js';

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8') || '{}';
  return JSON.parse(text);
}

export function createAuthRoutes(authGateway: AuthGateway, accountStore: LocalAccountStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await readJson(req);
      const username = String(body.username ?? '');
      const password = String(body.password ?? '');
      const result = accountStore.register(username, password, Boolean(body.isAdmin));
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: result }));
      return true;
    }

    if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await readJson(req);
      const session = await authGateway.authenticate(JSON.stringify({ username: body.username, password: body.password }));
      if (!session) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'invalid_credentials', message: 'Invalid username or password' } }));
        return true;
      }
      const role = session.isAdmin ? 'admin' : 'user';
      const token = signJwt({ sub: session.accountId, role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { accountId: session.accountId, provider: session.provider, role, token } }));
      return true;
    }

    return false;
  };
}
