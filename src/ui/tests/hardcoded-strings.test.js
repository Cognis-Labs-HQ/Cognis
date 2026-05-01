import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

const JS_ROOTS = ['src/ui/app', 'src/ui/layouts'];

// Rules for quoted string literals (single/double quotes).
// Strings must have both letters AND whitespace to be considered user-facing by
// this check, so single-word labels are handled by the template-literal check below.
function isAllowed(value) {
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith('ui.')) return true;
  if (/^cognis_|^application\/|^content-type$/.test(v)) return true;
  if (/^\/?[a-z0-9_./:-]+$/i.test(v)) return true;
  if (/^Inter, Arial, sans-serif$/.test(v)) return true;
  if (v.includes('${')) return true;
  if (v.startsWith('.')) return true;
  if (v.includes('#') && v.includes(',')) return true;
  if (/^(none|fade|float|dark|admin|user|enabled|disabled|available|ok|core|page|active)$/.test(v)) return true;
  return false;
}

// Rules for literal text nodes extracted from HTML inside template literals.
// These are the characters that appear directly between > and < with no
// interpolation, so the bar is intentionally strict.
function isAllowedTemplateTextNode(value) {
  const v = value.trim();
  if (!v) return true;
  if (!/[A-Za-z]/.test(v)) return true; // symbols, emoji, numbers only
  // Animation/motion values that double as <option> display text in settings
  if (/^(none|fade|float)$/.test(v)) return true;
  return false;
}

test('no hardcoded user-facing string literals in ui js', () => {
  const hits = [];
  for (const root of JS_ROOTS) {
    for (const file of walk(root)) {
      if (!file.endsWith('.js')) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)) {
        const val = m[2];
        if (!/[A-Za-z]/.test(val) || !/\s/.test(val)) continue;
        if (isAllowed(val)) continue;
        hits.push(`${file}: ${val.trim()}`);
      }
    }
  }
  assert.equal(hits.length, 0, `Hardcoded UI strings found:\n${[...new Set(hits)].join('\n')}`);
});

test('no hardcoded text nodes inside HTML template literals in ui js', () => {
  const hits = [];
  for (const root of JS_ROOTS) {
    for (const file of walk(root)) {
      if (!file.endsWith('.js')) continue;
      const src = readFileSync(file, 'utf8');
      // Extract simple (non-nested) template literal segments.
      // Each match captures the literal content between backticks.
      // Note: this regex does not handle escaped backticks (\`) or nested
      // template literals (template expressions containing their own backtick
      // strings). Those patterns do not currently exist in this codebase; if
      // they are introduced, this check should be updated accordingly.
      for (const [, content] of src.matchAll(/`([^`]*)`/g)) {
        // Match literal text between a closing and opening HTML tag.
        // The character class excludes backtick, `$`, `{`, and `}` so that
        // interpolated expressions never produce a false positive. Quotes are
        // intentionally allowed so that apostrophes and quoted phrases in text
        // content (e.g. "It's done") are still detected.
        for (const [, text] of content.matchAll(/>([^<>`${}]+)(?=<)/g)) {
          const val = text.trim();
          if (!val) continue;
          if (!/[A-Za-z]/.test(val)) continue;
          if (isAllowedTemplateTextNode(val)) continue;
          hits.push(`${file}: "${val}"`);
        }
      }
    }
  }
  assert.equal(hits.length, 0, `Hardcoded HTML text nodes in template literals:\n${[...new Set(hits)].join('\n')}`);
});
