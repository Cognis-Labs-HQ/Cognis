import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DOCS_ROOT = join(process.cwd(), 'docs', 'components');

export function createDocsRoutes() {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (req.method !== 'GET') return false;

    if (url.pathname === '/api/v1/docs') {
      const files = await readdir(DOCS_ROOT);
      const docs = files
        .filter((name) => name.endsWith('.md'))
        .map((name) => ({ slug: name.replace(/\.md$/, ''), path: `/api/v1/docs/${name.replace(/\.md$/, '')}` }));

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: docs }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/docs\/([a-z0-9-]+)$/i);
    if (!match) return false;

    const slug = match[1];
    const content = await readFile(join(DOCS_ROOT, `${slug}.md`), 'utf-8');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { slug, markdown: content } }));
    return true;
  };
}
