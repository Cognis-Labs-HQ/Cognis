import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const repositoryRoot = process.cwd();
const outputRoot = path.join(repositoryRoot, 'dist', 'ui');
const assetRoot = path.join(outputRoot, 'assets');
const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(entryPath) : [entryPath];
    }),
  );
  return files.flat();
}

function logicalUrls(filePath) {
  const relativePath = path
    .relative(repositoryRoot, filePath)
    .split(path.sep)
    .join('/');
  if (relativePath.startsWith('src/ui/')) {
    return [`/static/${relativePath.slice('src/ui/'.length)}`];
  }
  const componentMatch = relativePath.match(
    /^src\/(gateways|adapters|modules)\/(.+)$/,
  );
  if (!componentMatch) return [];
  const componentType = componentMatch[1];
  const remainder = componentMatch[2];
  const typePrefix = componentType === 'adapters' ? 'adapters' : componentType;
  const urls = new Set([`/static/${typePrefix}/${remainder}`]);
  urls.add(`/static/${typePrefix}/${remainder.replace('/ui/', '/')}`);
  return [...urls];
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(assetRoot, { recursive: true });
const sourceFiles = (await walk(path.join(repositoryRoot, 'src')))
  .filter((filePath) => /\.(?:css|js)$/.test(filePath))
  .filter(
    (filePath) =>
      !filePath.includes('/tests/') && !filePath.endsWith('.test.js'),
  )
  .filter(
    (filePath) =>
      filePath.includes('/src/ui/') ||
      (/\/src\/(?:gateways|adapters|modules)\//.test(filePath) &&
        filePath.includes('/ui/')),
  );
const resolvableFiles = await walk(path.join(repositoryRoot, 'src'));
const logicalSourcePaths = new Map();
for (const filePath of resolvableFiles) {
  for (const logicalUrl of logicalUrls(filePath))
    logicalSourcePaths.set(logicalUrl, filePath);
}
for (const filePath of await walk(
  path.join(repositoryRoot, 'src', 'ui', 'public'),
)) {
  const publicRelativePath = path
    .relative(path.join(repositoryRoot, 'src', 'ui', 'public'), filePath)
    .split(path.sep)
    .join('/');
  logicalSourcePaths.set(`/static/${publicRelativePath}`, filePath);
}
const importedSourcePaths = new Set();
for (const sourcePath of sourceFiles) {
  const contents = await readFile(sourcePath, 'utf8');
  for (const match of contents.matchAll(
    /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*|@import\s+(?:url\()?)["']([^"']+)["']/g,
  )) {
    const specifier = match[1];
    const importedPath = specifier.startsWith('/static/')
      ? logicalSourcePaths.get(specifier)
      : specifier.startsWith('.')
        ? path.resolve(path.dirname(sourcePath), specifier)
        : undefined;
    if (importedPath) importedSourcePaths.add(importedPath);
  }
}
const forcedEntryPaths = new Set();
for (const htmlPath of (await walk(path.join(repositoryRoot, 'src'))).filter(
  (filePath) => filePath.endsWith('.html'),
)) {
  const html = await readFile(htmlPath, 'utf8');
  for (const match of html.matchAll(
    /(?:src|href)=["'](\/static\/[^"']+)["']/g,
  )) {
    const sourcePath = logicalSourcePaths.get(match[1]);
    if (sourcePath && /\.(?:css|js)$/.test(sourcePath)) {
      forcedEntryPaths.add(sourcePath);
    }
  }
}
for (const descriptorPath of resolvableFiles.filter(
  (filePath) => /\.(?:js|ts)$/.test(filePath) && !filePath.includes('/tests/'),
)) {
  const contents = await readFile(descriptorPath, 'utf8');
  for (const match of contents.matchAll(
    /scriptUrl\s*:\s*["'](\/static\/[^"']+\.js)["']/g,
  )) {
    const sourcePath = logicalSourcePaths.get(match[1]);
    if (sourcePath) forcedEntryPaths.add(sourcePath);
  }
}
const entrySourcePaths = sourceFiles.filter(
  (filePath) =>
    forcedEntryPaths.has(filePath) || !importedSourcePaths.has(filePath),
);
const entryPoints = Object.fromEntries(
  entrySourcePaths.map((filePath, index) => [`entry-${index}`, filePath]),
);
const result = await build({
  entryPoints,
  outdir: assetRoot,
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  metafile: true,
  entryNames: '[name]-[hash]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'media/[name]-[hash]',
  loader: { '.png': 'file', '.svg': 'file', '.webp': 'file' },
  plugins: [
    {
      name: 'cognis-static-assets',
      setup(buildContext) {
        buildContext.onResolve({ filter: /^\/static\// }, (args) => {
          const resolvedPath = logicalSourcePaths.get(args.path);
          return resolvedPath ? { path: resolvedPath } : undefined;
        });
      },
    },
  ],
});
const manifest = {};
for (const [outputPath, metadata] of Object.entries(result.metafile.outputs)) {
  if (!metadata.entryPoint) continue;
  const emittedUrl = `/${path.relative(outputRoot, path.resolve(repositoryRoot, outputPath)).split(path.sep).join('/')}`;
  for (const logicalUrl of logicalUrls(
    path.resolve(repositoryRoot, metadata.entryPoint),
  )) {
    manifest[logicalUrl] = emittedUrl;
  }
}
await cp(
  path.join(repositoryRoot, 'src', 'ui', 'public'),
  path.join(outputRoot, 'public'),
  { recursive: true },
);
await writeFile(
  path.join(outputRoot, 'asset-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
for (const htmlPath of (await walk(path.join(outputRoot, 'public'))).filter(
  (filePath) => filePath.endsWith('.html'),
)) {
  let html = await readFile(htmlPath, 'utf8');
  for (const [sourceUrl, emittedUrl] of Object.entries(manifest)) {
    html = html.replaceAll(sourceUrl, emittedUrl);
  }
  await writeFile(htmlPath, html);
}
const emittedFiles = await walk(outputRoot);
await Promise.all(
  emittedFiles
    .filter((filePath) =>
      /\.(?:css|html|js|json|mjs|svg|webmanifest|xml)$/.test(filePath),
    )
    .flatMap(async (filePath) => {
      const contents = await readFile(filePath);
      return Promise.all([
        writeFile(`${filePath}.br`, await compressBrotli(contents)),
        writeFile(`${filePath}.gz`, await compressGzip(contents)),
      ]);
    }),
);
console.log(
  `Built ${Object.keys(manifest).length} production UI asset mappings.`,
);
