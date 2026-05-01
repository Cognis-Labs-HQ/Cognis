import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HealthService } from '@cognis/core';

const execFileAsync = promisify(execFile);
const DEFAULT_FONT_CATALOG = ['Orbitron', 'Inter', 'Arial', 'sans-serif'];
const FONT_CACHE_TTL_MS = 5 * 60 * 1000;
let fontsCache: { expiresAt: number; data: string[] } | null = null;

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
    const now = Date.now();
    if (fontsCache && fontsCache.expiresAt > now) return fontsCache.data;

    const { stdout } = await execFileAsync('fc-list', [':', 'family'], { timeout: 3000, maxBuffer: 10 * 1024 * 1024 });
    const fonts = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => line.split(','))
      .map((font) => font.trim())
      .filter(Boolean);

    const mergedFonts = Array.from(new Set([...DEFAULT_FONT_CATALOG, ...fonts])).sort((a, b) => a.localeCompare(b));
    const resolvedFonts = mergedFonts.length > 0 ? mergedFonts : [...DEFAULT_FONT_CATALOG];
    fontsCache = { data: resolvedFonts, expiresAt: now + FONT_CACHE_TTL_MS };
    return resolvedFonts;
  } catch {
    return [...DEFAULT_FONT_CATALOG];
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
