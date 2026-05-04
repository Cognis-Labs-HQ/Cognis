import { requireAuth, getAuthClaims } from '../../auth/guard.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJson } from '../read-json.js';
import type { CoreNotificationGateway } from '../../gateways/notification.js';
import type { DbNotificationStore } from '../../adapters/db/notification-store.js';

export function createNotificationRoutes(
  gateway: CoreNotificationGateway,
  notifStore?: DbNotificationStore,
) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/notifications/send' && req.method === 'POST') {
      if (!requireAuth(req, res, 'admin')) return true;

      const body = await readJson(req);
      const category = String(body.category ?? '');
      const recipientUsername = String(body.recipientUsername ?? '');
      const subject = String(body.subject ?? '');
      const notifBody = String(body.body ?? '');
      const recipientEmail = body.recipientEmail != null ? String(body.recipientEmail) : undefined;

      if (!category || !recipientUsername || !subject || !notifBody) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'missing_fields', message: 'category, recipientUsername, subject, and body are required' } }));
        return true;
      }

      const result = await gateway.dispatch({
        category,
        recipientUsername,
        recipientEmail,
        subject,
        body: notifBody,
        metadata: body.metadata as Record<string, unknown> | undefined,
      });

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: result }));
      return true;
    }

    if (url.pathname === '/api/v1/notifications/providers' && req.method === 'GET') {
      if (!requireAuth(req, res, 'admin')) return true;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: gateway.listSenders() }));
      return true;
    }

    if (url.pathname === '/api/v1/notifications/categories' && req.method === 'GET') {
      const claims = getAuthClaims(req);
      if (!claims) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Login required' } }));
        return true;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: gateway.listCategories() }));
      return true;
    }

    const providerConfigMatch = url.pathname.match(/^\/api\/v1\/notifications\/providers\/([^/]+)\/config$/);
    if (providerConfigMatch) {
      const senderId = decodeURIComponent(providerConfigMatch[1]);

      if (req.method === 'GET') {
        if (!requireAuth(req, res, 'admin')) return true;
        const config = gateway.getProviderConfig(senderId);
        if (config === null) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'not_found', message: 'Provider not found or has no config' } }));
          return true;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: config,
          envValues: gateway.getProviderEnvValues(senderId) ?? {},
          requiredFields: gateway.getProviderRequiredFields(senderId) ?? [],
        }));
        return true;
      }

      if (req.method === 'PUT') {
        if (!requireAuth(req, res, 'admin')) return true;
        const body = await readJson(req);
        await gateway.saveProviderConfig(senderId, body as Record<string, unknown>);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { saved: true } }));
        return true;
      }

      return false;
    }

    const providerTestMatch = url.pathname.match(/^\/api\/v1\/notifications\/providers\/([^/]+)\/test$/);
    if (providerTestMatch && req.method === 'POST') {
      if (!requireAuth(req, res, 'admin')) return true;
      const senderId = decodeURIComponent(providerTestMatch[1]);
      const body = await readJson(req);
      const to = String(body.to ?? '');
      const overrideConfig = body.config != null && typeof body.config === 'object' && !Array.isArray(body.config)
        ? body.config as Record<string, unknown>
        : undefined;
      const sender = gateway.getSender(senderId);
      if (!sender || typeof sender.sendTestEmail !== 'function') {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_supported', message: 'Provider does not support test emails' } }));
        return true;
      }
      await sender.sendTestEmail(to, overrideConfig);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { sent: true } }));
      return true;
    }

    const userPrefsMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/notification-prefs$/);
    if (userPrefsMatch) {
      const username = decodeURIComponent(userPrefsMatch[1]);

      const claims = getAuthClaims(req);
      if (!claims) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Login required' } }));
        return true;
      }
      if (claims.sub !== username && claims.role !== 'admin') {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Access denied' } }));
        return true;
      }

      if (req.method === 'GET') {
        if (!notifStore) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ data: [] }));
          return true;
        }
        const prefs = await notifStore.getUserNotifPrefs(username);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: prefs }));
        return true;
      }

      if (req.method === 'PUT') {
        if (!notifStore) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ data: { saved: true } }));
          return true;
        }
        const body = await readJson(req);
        const prefsArray = Array.isArray(body) ? body : [];
        await notifStore.saveUserNotifPrefs(username, prefsArray as Array<{ category: string; senderId: string; enabled: boolean }>);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { saved: true } }));
        return true;
      }

      return false;
    }

    return false;
  };
}
