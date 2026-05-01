import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HealthService } from '@cognis/core';

function parseDemoModeFromEnv() {
  const raw = process.env.COGNIS_UI_DEMO_MODE;
  return raw === '1' || raw === 'true';
}

export function createSystemRoutes(healthService: HealthService) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const isHealthRoute = (url.pathname === '/api/v1/system/health' || url.pathname === '/api/v1/system/healthcheck') && req.method === 'GET';

    if (isHealthRoute) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: healthService.status() }));
      return true;
    }

    if (url.pathname === '/api/v1/system/ui-config' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { demoMode: parseDemoModeFromEnv() } }));
      return true;
    }

    return false;
  };
}
