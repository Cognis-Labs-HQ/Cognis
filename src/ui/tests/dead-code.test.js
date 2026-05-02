import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const CSS_ROOTS = [join(ROOT, 'src/ui/styles'), join(ROOT, 'src/ui/reuse')];
const USAGE_ROOTS = [
  join(ROOT, 'src/ui/app'),
  join(ROOT, 'src/ui/layouts'),
  join(ROOT, 'src/ui/reuse'),
  join(ROOT, 'src/ui/public'),
];

function extractDefinedCssClasses() {
  const map = new Map();
  for (const root of CSS_ROOTS) {
    for (const file of walk(root)) {
      if (!file.endsWith('.css')) continue;
      const src = readFileSync(file, 'utf8');
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/@import\s+url\([^)]*\)[^;]*;/g, '');
      for (const m of stripped.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
        const cls = m[1];
        if (!map.has(cls)) map.set(cls, file);
      }
    }
  }
  return map;
}

function extractAppliedCssClasses(content) {
  const classes = new Set();

  const addTokens = (str) => {
    for (const tok of str.trim().split(/\s+/)) {
      if (/^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]$|^[a-zA-Z]$/.test(tok)) classes.add(tok);
    }
  };

  for (const m of content.matchAll(/\bclass="([^"$]*)/g)) addTokens(m[1]);
  for (const m of content.matchAll(/\bclass='([^'$]*)/g)) addTokens(m[1]);

  for (const m of content.matchAll(/classList\.(?:add|remove)\([^)]+\)/g)) {
    for (const arg of m[0].matchAll(/['"]([a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]|[a-zA-Z])['"]/g)) classes.add(arg[1]);
  }
  for (const m of content.matchAll(/classList\.(?:toggle|contains)\(\s*['"]([a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]|[a-zA-Z])['"]/g)) {
    classes.add(m[1]);
  }

  for (const m of content.matchAll(/\bclassName\s*[=:]\s*['"]([^'"]+)['"]/g)) addTokens(m[1]);

  for (const m of content.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    for (const cm of m[1].matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) classes.add(cm[1]);
  }

  return classes;
}

// CSS classes whose names are assembled at runtime via string interpolation
// and therefore cannot be detected by static text search.
// Example: class="integrity-${row.status}" produces integrity-ok / mismatch / missing.
const DYNAMIC_CLASS_NAMES = new Set([
  'integrity-ok',
  'integrity-mismatch',
  'integrity-missing',
]);

// CSS classes applied in HTML/JS that carry no styling by design: they serve
// as BEM structure markers, JS selector hooks, or semantic modifiers that
// are deliberately left unstyled. Remove from this list if styling is added.
const SELECTOR_HOOK_CLASSES = new Set([
  'admin-only',
  'app-page',
  'app-page__header',
  'app-page__main',
  'auth-page',
  'global-navrow-surface',
  'panel',
  'stack',
  'user-dropdown-content',
]);

// Reuse module exports that are fully implemented but not yet wired up to
// any consuming page. Wire them up and remove from this list, or delete
// the export if it is no longer needed.
const PENDING_INTEGRATION_EXPORTS = new Set([
  'createPageComposer',
]);

test('no dead CSS classes (defined but never referenced in scripts or templates)', () => {
  const cssDefinitions = extractDefinedCssClasses();

  const usageContent = USAGE_ROOTS
    .flatMap((root) => walk(root).filter((f) => f.endsWith('.js') || f.endsWith('.html')))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  const dead = [];
  for (const [cls, defFile] of cssDefinitions) {
    if (DYNAMIC_CLASS_NAMES.has(cls)) continue;
    if (!usageContent.includes(cls)) {
      dead.push(`  .${cls}  (defined in ${defFile})`);
    }
  }

  assert.equal(
    dead.length,
    0,
    `Dead CSS classes found (defined but never referenced in scripts or templates):\n${dead.join('\n')}`,
  );
});

test('no missing CSS definitions (class applied in scripts or templates but not defined in any stylesheet)', () => {
  const cssDefinitions = extractDefinedCssClasses();

  const appliedClasses = new Set();
  for (const root of USAGE_ROOTS) {
    for (const file of walk(root)) {
      if (!file.endsWith('.js') && !file.endsWith('.html')) continue;
      const content = readFileSync(file, 'utf8');
      for (const cls of extractAppliedCssClasses(content)) appliedClasses.add(cls);
    }
  }

  const missing = [];
  for (const cls of appliedClasses) {
    if (DYNAMIC_CLASS_NAMES.has(cls)) continue;
    if (SELECTOR_HOOK_CLASSES.has(cls)) continue;
    if (!cssDefinitions.has(cls)) {
      missing.push(`  .${cls}  (applied in scripts/templates but not defined in any stylesheet)`);
    }
  }

  assert.equal(
    missing.length,
    0,
    `Missing CSS definitions:\n${missing.join('\n')}`,
  );
});

test('no dead exports in reuse modules (exported but never imported by any page or layout)', () => {
  const reusePath = join(ROOT, 'src/ui/reuse');
  const consumerRoots = [join(ROOT, 'src/ui/app'), join(ROOT, 'src/ui/layouts')];

  const consumerContent = consumerRoots
    .flatMap((root) => walk(root).filter((f) => f.endsWith('.js')))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  const dead = [];
  for (const file of walk(reusePath)) {
    if (!file.endsWith('.js')) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)|^export\s+const\s+(\w+)/gm)) {
      const name = m[1] ?? m[2];
      if (PENDING_INTEGRATION_EXPORTS.has(name)) continue;
      if (!consumerContent.includes(name)) {
        dead.push(`  ${name}  (from ${file})`);
      }
    }
  }

  assert.equal(
    dead.length,
    0,
    `Dead reuse exports found (exported but never imported):\n${dead.join('\n')}`,
  );
});

test('no missing named imports from relative modules', () => {
  const consumerRoots = [
    join(ROOT, 'src/ui/app'),
    join(ROOT, 'src/ui/layouts'),
    join(ROOT, 'src/ui/reuse'),
  ];

  const missing = [];
  for (const root of consumerRoots) {
    for (const file of walk(root)) {
      if (!file.endsWith('.js')) continue;
      const src = readFileSync(file, 'utf8');
      const fileDir = dirname(file);

      for (const m of src.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/gm)) {
        const names = m[1]
          .split(',')
          .map((n) => n.trim().replace(/\s+as\s+\w+$/, '').trim())
          .filter(Boolean);
        const relPath = m[2];
        const targetPath = resolve(fileDir, relPath);

        if (!existsSync(targetPath)) {
          missing.push(`  Module not found: ${relPath}  (imported from ${file})`);
          continue;
        }

        const targetSrc = readFileSync(targetPath, 'utf8');
        const exported = new Set(
          [...targetSrc.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)|^export\s+(?:const|class)\s+(\w+)/gm)]
            .map((em) => em[1] ?? em[2]),
        );

        for (const name of names) {
          if (!exported.has(name)) {
            missing.push(`  '${name}' is not exported by ${relPath}  (imported in ${file})`);
          }
        }
      }
    }
  }

  assert.equal(
    missing.length,
    0,
    `Missing named imports from relative modules:\n${missing.join('\n')}`,
  );
});
