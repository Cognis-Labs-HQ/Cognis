import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HealthService } from '@cognis/core';
import { requireAuth } from '../auth/guard.js';
import { readJson } from './read-json.js';

async function listLanguages() {
  const root = join(process.cwd(), 'src', 'ui', 'languages');
  const entries = await readdir(root, { withFileTypes: true });
  const languages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(root, entry.name, 'manifest.yml');
    try {
      const raw = await readFile(manifestPath, 'utf8');
      const data = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
        const [k, ...rest] = line.split(':');
        return [k.trim(), rest.join(':').trim()];
      }));
      if (data.iso_code && data.name) languages.push({ ...data, key: entry.name });
    } catch {}
  }
  return languages;
}

function parseDemoModeFromEnv() {
  const raw = process.env.COGNIS_UI_DEMO_MODE;
  return raw === '1' || raw === 'true';
}

function parseTutorialsAllowedByEnv() {
  const raw = process.env.ALLOW_TUTORIALS;
  return raw !== '0' && raw !== 'false';
}

let tutorialsRuntimeEnabled = true;

export function createSystemRoutes(healthService: HealthService) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const isHealthRoute = (url.pathname === '/api/v1/system/health' || url.pathname === '/api/v1/system/healthcheck') && req.method === 'GET';

    if (isHealthRoute) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: healthService.status() }));
      return true;
    }

    if (url.pathname === '/api/v1/system/languages' && req.method === 'GET') {
      const languages = await listLanguages();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: languages }));
      return true;
    }

    if (url.pathname === '/api/v1/system/ui-config' && req.method === 'GET') {
      const tutorialsEnabled = parseTutorialsAllowedByEnv() && tutorialsRuntimeEnabled;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { demoMode: parseDemoModeFromEnv(), tutorialsEnabled } }));
      return true;
    }

    if (url.pathname === '/api/v1/system/config/tutorials' && req.method === 'PUT') {
      if (!requireAuth(req, res, 'admin')) return true;

      if (!parseTutorialsAllowedByEnv()) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'forbidden', message: 'ALLOW_TUTORIALS is disabled by environment configuration' } }));
        return true;
      }

      const body = await readJson(req);
      if (typeof body.enabled !== 'boolean') {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'bad_request', message: 'enabled must be a boolean' } }));
        return true;
      }

      tutorialsRuntimeEnabled = body.enabled;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { tutorialsEnabled: tutorialsRuntimeEnabled } }));
      return true;
    }

    return false;
  };
}
