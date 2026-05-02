import { requireAuth } from '../auth/guard.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NotificationGateway } from '@cognis/core';
import { readJson } from './read-json.js';

export function createNotificationRoutes(gateway: NotificationGateway) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname !== '/api/v1/notifications/send' || req.method !== 'POST') {
      return false;
    }

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
  };
}
