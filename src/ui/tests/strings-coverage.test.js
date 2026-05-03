import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) out.push(...walk(fullPath));
    else out.push(fullPath);
  }
  return out;
}

function parseKeys(xml) {
  const keys = [];
  for (const match of xml.matchAll(/<string\s+name="([^"]+)"/g)) {
    keys.push(match[1]);
  }
  return keys;
}

// Group all strings.xml files by cluster. A cluster is the directory that
// contains the per-language subdirectories, e.g. src/ui/languages for
// src/ui/languages/en/strings.xml and src/ui/languages/de/strings.xml.
function discoverClusters() {
  const clusters = new Map();
  for (const filePath of walk(ROOT)) {
    if (!filePath.endsWith('/strings.xml')) continue;
    if (filePath.includes('node_modules')) continue;
    const langDir = dirname(filePath);
    const lang = langDir.split('/').at(-1);
    const clusterDir = dirname(langDir);
    if (!clusters.has(clusterDir)) clusters.set(clusterDir, new Map());
    clusters.get(clusterDir).set(lang, filePath);
  }
  return clusters;
}

const clusters = discoverClusters();

test('every strings.xml cluster has an English baseline', () => {
  const missing = [];
  for (const [clusterDir, langs] of clusters) {
    if (!langs.has('en')) missing.push(clusterDir);
  }
  assert.equal(
    missing.length,
    0,
    `Clusters missing an English (en) strings.xml baseline:\n${missing.join('\n')}`,
  );
});

test('no keys missing from translated strings.xml files relative to English', () => {
  const hits = [];
  for (const [clusterDir, langs] of clusters) {
    if (!langs.has('en')) continue;
    const baselineKeys = parseKeys(readFileSync(langs.get('en'), 'utf8'));
    const baselineSet = new Set(baselineKeys);
    for (const [lang, filePath] of langs) {
      if (lang === 'en') continue;
      const translatedKeys = new Set(parseKeys(readFileSync(filePath, 'utf8')));
      for (const key of baselineSet) {
        if (!translatedKeys.has(key)) {
          hits.push(`  [${clusterDir}] ${lang}: missing key "${key}"`);
        }
      }
    }
  }
  assert.equal(
    hits.length,
    0,
    `Keys missing from translated files:\n${hits.join('\n')}`,
  );
});

test('no extra keys in translated strings.xml files beyond the English baseline', () => {
  const hits = [];
  for (const [clusterDir, langs] of clusters) {
    if (!langs.has('en')) continue;
    const baselineSet = new Set(parseKeys(readFileSync(langs.get('en'), 'utf8')));
    for (const [lang, filePath] of langs) {
      if (lang === 'en') continue;
      const translatedKeys = parseKeys(readFileSync(filePath, 'utf8'));
      for (const key of translatedKeys) {
        if (!baselineSet.has(key)) {
          hits.push(`  [${clusterDir}] ${lang}: extra key "${key}" not in English baseline`);
        }
      }
    }
  }
  assert.equal(
    hits.length,
    0,
    `Extra keys found in translated files:\n${hits.join('\n')}`,
  );
});

test('key order in translated strings.xml files matches the English baseline', () => {
  const hits = [];
  for (const [clusterDir, langs] of clusters) {
    if (!langs.has('en')) continue;
    const baselineKeys = parseKeys(readFileSync(langs.get('en'), 'utf8'));
    for (const [lang, filePath] of langs) {
      if (lang === 'en') continue;
      const translatedKeys = parseKeys(readFileSync(filePath, 'utf8'));
      const translatedSet = new Set(translatedKeys);
      const baselineSet = new Set(baselineKeys);
      const translatedFiltered = translatedKeys.filter((key) => baselineSet.has(key));
      const baselineFiltered = baselineKeys.filter((key) => translatedSet.has(key));
      for (let pos = 0; pos < baselineFiltered.length; pos++) {
        if (baselineFiltered[pos] !== translatedFiltered[pos]) {
          hits.push(
            `  [${clusterDir}] ${lang}: key order mismatch at position ${pos + 1}` +
            ` — expected "${baselineFiltered[pos]}", found "${translatedKeys[pos]}"`,
          );
          break;
        }
      }
    }
  }
  assert.equal(
    hits.length,
    0,
    `Key order in translated files does not match the English baseline:\n${hits.join('\n')}`,
  );
});
