import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SRC_ROOT = join(process.cwd(), 'src');
const DEFAULT_LANG = 'en';
const SAFE_LANG_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

function resolveLang(url: URL): string {
  const queryLang = (url.searchParams.get('lang') || '').toLowerCase();
  if (SAFE_LANG_PATTERN.test(queryLang)) return queryLang;
  return DEFAULT_LANG;
}

async function findDocsDirs(dir: string, results: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = join(dir, entry.name);
    if (entry.name === 'docs') {
      results.push(fullPath);
    } else {
      await findDocsDirs(fullPath, results);
    }
  }
  return results;
}

async function collectFilesRecursive(dir: string, root: string, results: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFilesRecursive(fullPath, root, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function collectAllSlugs(): Promise<Array<{ slug: string; path: string }>> {
  const docsDirs = await findDocsDirs(SRC_ROOT);
  const bySlug = new Map<string, { slug: string; path: string }>();

  for (const dir of docsDirs) {
    const files = await collectFilesRecursive(dir, dir);
    for (const absPath of files) {
      const relFromSrc = relative(SRC_ROOT, absPath).replace(/\\/g, '/');
      const slug = relFromSrc
        .replace(/\.md$/, '')
        .replace(/\.[a-z]{2}(?:-[a-z]{2})?$/i, '');
      if (!bySlug.has(slug)) {
        bySlug.set(slug, { slug, path: `/api/v1/docs/${slug}` });
      }
    }
  }

  return [...bySlug.values()];
}

export function createDocsRoutes() {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (req.method !== 'GET') return false;

    if (url.pathname === '/api/v1/docs') {
      const slugs = await collectAllSlugs();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: slugs }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/docs\/([a-z0-9/_-]+)$/i);
    if (!match) return false;

    const rawSlug = match[1].replace(/\.\./g, '').replace(/\/+/g, '/');
    const lang = resolveLang(url);

    const langPath = resolve(SRC_ROOT, `${rawSlug}.${lang}.md`);
    const defaultPath = resolve(SRC_ROOT, `${rawSlug}.md`);

    if (!langPath.startsWith(SRC_ROOT) || !defaultPath.startsWith(SRC_ROOT)) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'Documentation not found' } }));
      return true;
    }

    let content: string | undefined;
    try {
      content = await readFile(langPath, 'utf-8');
    } catch {
      try {
        content = await readFile(defaultPath, 'utf-8');
      } catch {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Documentation not found' } }));
        return true;
      }
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { slug: rawSlug, markdown: content } }));
    return true;
  };
}
