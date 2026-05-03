import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DOCS_ROOT = join(process.cwd(), 'src', 'docs', 'components');
const DEFAULT_LANG = 'en';
const SAFE_LANG_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

function resolveLang(url: URL) {
  const queryLang = (url.searchParams.get('lang') || '').toLowerCase();
  if (SAFE_LANG_PATTERN.test(queryLang)) return queryLang;
  return DEFAULT_LANG;
}

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
      const bySlug = new Map<string, { slug: string, path: string }>();
      files.forEach((file) => {
        const slug = file.replace(/\.md$/, '').replace(/\.[a-z]{2}(?:-[a-z]{2})?$/i, '');
        if (!bySlug.has(slug)) bySlug.set(slug, { slug, path: `/api/v1/docs/${slug}` });
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [...bySlug.values()] }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/docs\/([a-z0-9/-]+)$/i);
    if (!match) return false;

    const slug = match[1].replace(/\.\./g, '');
    const lang = resolveLang(url);
    let markdownPath = join(DOCS_ROOT, `${slug}.${lang}.md`);
    let content;
    try {
      content = await readFile(markdownPath, 'utf-8');
    } catch {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'Documentation not found' } }));
      return true;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { slug, markdown: content } }));
    return true;
  };
}
