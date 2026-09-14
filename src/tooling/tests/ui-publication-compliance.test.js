import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);
const EXPORTED_UTILITY_PATTERNS = [
  /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  /\bexport\s+(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g,
];
const DECLARATION_PATTERNS = [
  /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  /\b(?:export\s+)?(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g,
];

function walk(directoryPath) {
  if (!existsSync(directoryPath)) return [];
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function collectExportedUtilityNames(reuseRoot) {
  const names = new Set();
  for (const filePath of walk(reuseRoot)) {
    if (!JAVASCRIPT_EXTENSIONS.has(extname(filePath))) continue;
    if (normalizePath(filePath).includes('/tests/')) continue;
    const source = readFileSync(filePath, 'utf8');
    for (const pattern of EXPORTED_UTILITY_PATTERNS) {
      for (const match of source.matchAll(pattern)) names.add(match[1]);
    }
  }
  return names;
}

function isPageEntry(source) {
  return /\bexport\s+async\s+function\s+mount\b\s*\(/.test(
    stripComments(source),
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function collectUiPublicationViolations({ sourceRoot, hostReuseRoot }) {
  const violations = [];
  const utilityNames = collectExportedUtilityNames(hostReuseRoot);
  const normalizedHostReuseRoot = normalizePath(resolve(hostReuseRoot));
  const isExternalModule = !normalizePath(resolve(sourceRoot)).endsWith('/src');

  for (const filePath of walk(sourceRoot)) {
    if (!JAVASCRIPT_EXTENSIONS.has(extname(filePath))) continue;
    if (normalizePath(filePath).includes('/tests/')) continue;
    const source = readFileSync(filePath, 'utf8');
    const displayPath = normalizePath(relative(ROOT, filePath));
    const isHostUtility = normalizePath(resolve(filePath)).startsWith(
      `${normalizedHostReuseRoot}/`,
    );
    const executableSource = stripComments(source);

    if (isPageEntry(source)) {
      if (!/\bcreatePageComposer\s*\(/.test(source)) {
        violations.push(`${displayPath}: page does not call createPageComposer`);
      }
      if (
        !/\bcreatePageComposer\s*\(/.test(source) &&
        /\broot\s*\.(?:innerHTML|outerHTML|replaceChildren|append|appendChild)\b/.test(source)
      ) {
        violations.push(`${displayPath}: page writes directly to its mount root`);
      }
    }

    const publishesForm =
      /<form\b/i.test(executableSource) ||
      /createElement\(\s*['"]form['"]\s*\)/.test(executableSource);
    const handlesSubmission =
      /addEventListener\(\s*['"]submit['"]/.test(executableSource) ||
      /\.onsubmit\s*=/.test(executableSource) ||
      /\bonSubmit\s*:/.test(executableSource);
    if (
      !isHostUtility &&
      (publishesForm || handlesSubmission) &&
      !/\bcreateFormBuilder\s*\(/.test(executableSource)
    ) {
      violations.push(
        `${displayPath}: form or submission does not use createFormBuilder`,
      );
    }

    if (isHostUtility || !isExternalModule) continue;
    for (const pattern of DECLARATION_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        if (!utilityNames.has(match[1])) continue;
        violations.push(
          `${displayPath}: redeclares Cognis reuse utility ${match[1]}`,
        );
      }
    }
  }

  return violations;
}

test('core and external module pages use Cognis UI infrastructure', () => {
  const hostReuseRoot = resolve(ROOT, 'src/ui/reuse');
  const scanRoots = [
    resolve(ROOT, 'src'),
    resolve(
      process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
        join(ROOT, 'external-modules'),
    ),
  ].filter(existsSync);
  const violations = scanRoots.flatMap((sourceRoot) =>
    collectUiPublicationViolations({ sourceRoot, hostReuseRoot }),
  );

  assert.deepEqual(
    violations,
    [],
    `UI pages must use createPageComposer and Cognis reuse utilities:\n${violations.join('\n')}`,
  );
});

test('UI publication validation rejects composer and reuse workarounds', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cognis-ui-compliance-'));
  const reuseRoot = join(fixtureRoot, 'host-reuse');
  const moduleRoot = join(fixtureRoot, 'external-module');
  mkdirSync(reuseRoot, { recursive: true });
  mkdirSync(join(moduleRoot, 'ui', 'app'), { recursive: true });
  writeFileSync(
    join(reuseRoot, 'toast.js'),
    'export function showToast() {}\n',
  );
  writeFileSync(
    join(moduleRoot, 'ui', 'app', 'index.js'),
    [
      'export function showToast() {}',
      'export async function mount(root) {',
      "  root.innerHTML = '<main></main>';",
      "  root.innerHTML = '<form></form>';",
      '}',
      '',
    ].join('\n'),
  );

  try {
    const violations = collectUiPublicationViolations({
      sourceRoot: moduleRoot,
      hostReuseRoot: reuseRoot,
    });
    assert.ok(violations.some((violation) => violation.includes('does not call createPageComposer')));
    assert.ok(violations.some((violation) => violation.includes('writes directly to its mount root')));
    assert.ok(violations.some((violation) => violation.includes('reuse utility showToast')));
    assert.ok(violations.some((violation) => violation.includes('does not use createFormBuilder')));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
