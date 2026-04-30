import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DOCS_ROOT = join(process.cwd(), 'docs', 'components');

async function collectMarkdownFiles(root: string, dir = root): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(root, fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(root, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

export function createDocsRoutes() {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (req.method !== 'GET') return false;

    if (url.pathname === '/api/v1/docs') {
      const files = await collectMarkdownFiles(DOCS_ROOT);
      const docs = files.map((file) => ({ slug: file.replace(/\.md$/, ''), path: `/api/v1/docs/${file.replace(/\.md$/, '')}` }));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: docs }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/docs\/([a-z0-9/-]+)$/i);
    if (!match) return false;

    const slug = match[1].replace(/\.\./g, '');
    const content = await readFile(join(DOCS_ROOT, `${slug}.md`), 'utf-8');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { slug, markdown: content } }));
    return true;
  };
}
