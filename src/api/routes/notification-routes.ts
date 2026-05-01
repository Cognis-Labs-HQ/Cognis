import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireAuth } from '../auth/guard.js';
import type { NotificationService } from '@cognis/core';

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createNotificationRoutes(notificationService: NotificationService) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname !== '/api/v1/notifications/send' || req.method !== 'POST') return false;

    const claims = requireAuth(req, res, 'admin');
    if (!claims) return true;

    const payload = await readBody(req);
    const result = await notificationService.deliver({
      channel: 'email',
      recipient: String(payload.recipient ?? ''),
      subject: String(payload.subject ?? ''),
      body: String(payload.body ?? '')
    });

    res.writeHead(result.delivered ? 200 : 400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: result }));
    return true;
  };
}
