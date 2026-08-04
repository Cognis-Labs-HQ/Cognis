import type { ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { BootstrapLog } from '@cognis/core';
import type { RouteContext } from './route-context.js';

export async function serveHtmlPage(
  res: ServerResponse,
  filePath: string,
  log?: BootstrapLog,
  logMeta?: Record<string, unknown>,
  routeContext?: RouteContext,
): Promise<void> {
  try {
    const file = await readFile(filePath);
    routeContext?.setPageSecurityHeaders(res);
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(file);
  } catch (error) {
    log?.('error', 'Failed to serve UI asset.', {
      component: 'api-ui',
      filePath,
      ...(logMeta ?? {}),
      error: error instanceof Error ? error.message : String(error),
    });
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: { code: 'not_found', message: 'Asset not found.' },
      }),
    );
  }
}

export async function serveHtmlPageWithReplacements(
  res: ServerResponse,
  filePath: string,
  replacements: Array<{ from: string; to: string }>,
  log?: BootstrapLog,
  logMeta?: Record<string, unknown>,
  routeContext?: RouteContext,
): Promise<void> {
  try {
    let html = await readFile(filePath, 'utf8');
    for (const replacement of replacements) {
      html = html.replaceAll(replacement.from, replacement.to);
    }
    routeContext?.setPageSecurityHeaders(res);
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(html);
  } catch (error) {
    log?.('error', 'Failed to serve UI asset.', {
      component: 'api-ui',
      filePath,
      ...(logMeta ?? {}),
      error: error instanceof Error ? error.message : String(error),
    });
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(
      '<!doctype html><html><body><h1>Not found</h1><p>Asset not found.</p></body></html>',
    );
  }
}
