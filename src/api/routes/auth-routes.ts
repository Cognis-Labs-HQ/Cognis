import { issueAccessToken } from '../auth/access-tokens.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthGateway } from '@cognis/core';
import type { LocalAccountStore } from '../adapters/local-auth-gateway.js';
import { readJson } from './read-json.js';

export function createAuthRoutes(authGateway: AuthGateway, accountStore: LocalAccountStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await readJson(req);
      const username = String(body.username ?? '');
      const password = String(body.password ?? '');
      const result = await accountStore.register(username, password, Boolean(body.isAdmin));
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
      const parsedTtlSeconds = Number.parseInt(process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS ?? '43200', 10);
      const accessTokenTtlSeconds = Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds >= 1 ? parsedTtlSeconds : 43200;
      const apiToken = issueAccessToken(session.accountId, role, accessTokenTtlSeconds);
      await accountStore.updateLastLogin(session.accountId);
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `cognis_access_token=${apiToken}; Path=/; HttpOnly; SameSite=Lax` });
      res.end(JSON.stringify({ data: { accountId: session.accountId, displayName: session.accountId, provider: session.provider, role, token: apiToken } }));
      return true;
    }

    return false;
  };
}
