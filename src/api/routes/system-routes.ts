import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HealthService } from '@cognis/core';

const execFileAsync = promisify(execFile);

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

async function listInstalledFonts() {
  try {
    const { stdout } = await execFileAsync('fc-list', [':', 'family']);
    const fonts = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => line.split(','))
      .map((font) => font.trim())
      .filter(Boolean);

    return [...new Set(fonts)].sort((a, b) => a.localeCompare(b));
  } catch {
    return ['Orbitron', 'Inter', 'Arial', 'sans-serif'];
  }
}

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

    if (url.pathname === '/api/v1/system/languages' && req.method === 'GET') {
      const languages = await listLanguages();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: languages }));
      return true;
    }

    if (url.pathname === '/api/v1/system/fonts' && req.method === 'GET') {
      const fonts = await listInstalledFonts();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: fonts }));
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
