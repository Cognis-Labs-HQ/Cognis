import { requireAuth } from '../auth/guard.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ModuleService } from '@cognis/core';

export function createModuleRoutes(moduleService: ModuleService) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/modules' && req.method === 'GET') {
      const claims = requireAuth(req, res, 'admin');
      if (!claims) return true;
      const data = await moduleService.list();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/modules\/([^/]+)\/(enable|disable)$/);
    if (!match || req.method !== 'POST') return false;

    const claims = requireAuth(req, res, 'admin');
    if (!claims) return true;

    const moduleId = decodeURIComponent(match[1]);
    const action = match[2];

    const acknowledged = req.headers['x-cognis-external-module-disclaimer'] === 'accepted' || url.searchParams.get('acknowledgeExternalDisclaimer') === 'true';
    const result =
      action === 'enable'
        ? await moduleService.enable(moduleId, { acknowledgeExternalDisclaimer: acknowledged })
        : await moduleService.disable(moduleId);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: result }));
    return true;
  };
}
