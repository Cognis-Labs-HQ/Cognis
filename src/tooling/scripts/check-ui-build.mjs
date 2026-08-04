import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve('dist/ui');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(entryPath) : [entryPath];
      }),
    )
  ).flat();
}

const manifest = JSON.parse(
  await readFile(path.join(outputRoot, 'asset-manifest.json'), 'utf8'),
);
assert.ok(
  Object.keys(manifest).length > 0,
  'asset manifest must contain dynamic contributions',
);
for (const [sourceUrl, emittedUrl] of Object.entries(manifest)) {
  assert.match(sourceUrl, /^\/static\//);
  assert.match(emittedUrl, /^\/assets\/.+-[A-Z0-9]+\.(?:css|js)$/i);
  const emittedPath = path.join(outputRoot, emittedUrl);
  await Promise.all([
    access(emittedPath),
    access(`${emittedPath}.br`),
    access(`${emittedPath}.gz`),
  ]);
}
const publicPages = await readdir(path.join(outputRoot, 'public', 'pages'));
for (const pageName of publicPages.filter((name) => name.endsWith('.html'))) {
  const html = await readFile(
    path.join(outputRoot, 'public', 'pages', pageName),
    'utf8',
  );
  for (const matchedUrl of html.matchAll(
    /(?:src|href)="(\/assets\/[^"?]+)"/g,
  )) {
    await access(path.join(outputRoot, matchedUrl[1]));
  }
}
for (const sourcePath of (await walk(path.resolve('src'))).filter(
  (filePath) => /\.(?:js|ts)$/.test(filePath) && !filePath.includes('/tests/'),
)) {
  const contents = await readFile(sourcePath, 'utf8');
  for (const match of contents.matchAll(
    /scriptUrl\s*:\s*["'](\/static\/[^"']+\.js)["']/g,
  )) {
    assert.ok(
      manifest[match[1]],
      `${path.relative(process.cwd(), sourcePath)} contributes unresolved asset ${match[1]}`,
    );
  }
}
console.log(
  `Validated ${Object.keys(manifest).length} dynamic contribution URLs.`,
);
