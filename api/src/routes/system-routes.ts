import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HealthService } from '@cognis/core';

export function createSystemRoutes(healthService: HealthService) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname !== '/api/v1/system/health' || req.method !== 'GET') {
      return false;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: healthService.status() }));
    return true;
  };
}
