import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const UI_ROOT = path.resolve(process.cwd(), 'ui');
const STATIC_ROOT = path.join(UI_ROOT, 'src');
const PUBLIC_ROOT = path.join(UI_ROOT, 'public');

function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('content-security-policy', "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'");
}

function resolveContentType(filePath: string) {
  const ext = path.extname(filePath);
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.html') return 'text/html; charset=utf-8';
  return 'image/png';
}

async function serveFile(res: ServerResponse, filePath: string, contentType: string) {
  try {
    const file = await readFile(filePath);
    setSecurityHeaders(res);
    res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    res.end(file);
  } catch {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'not_found', message: 'Asset not found.' } }));
  }
}

export function createUiRoutes() {
  return async (_req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/dashboard') {
      await serveFile(res, path.join(UI_ROOT, 'index.html'), 'text/html; charset=utf-8');
      return true;
    }

    if (url.pathname === '/login') {
      await serveFile(res, path.join(UI_ROOT, 'login.html'), 'text/html; charset=utf-8');
      return true;
    }

    if (!url.pathname.startsWith('/dashboard/static/')) return false;

    const relative = url.pathname.replace('/dashboard/static/', '');
    if (!/^[a-zA-Z0-9_./-]+$/.test(relative) || relative.includes('..')) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'bad_request', message: 'Invalid path.' } }));
      return true;
    }

    const filePath = relative.startsWith('assets/icons/')
      ? path.join(PUBLIC_ROOT, relative)
      : path.join(STATIC_ROOT, relative);

    await serveFile(res, filePath, resolveContentType(filePath));
    return true;
  };
}
