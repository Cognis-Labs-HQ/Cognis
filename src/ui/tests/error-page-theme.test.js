import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("error page applies stored theme before composing", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/error/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /import\s*\{\s*applyTheme,\s*getStoredTheme\s*\}\s*from\s*["']\.\.\/\.\.\/reuse\/theme-toggle\.js["'];/,
    );
    assert.match(source, /applyTheme\(getStoredTheme\(\)\);/);
});

test("error page stylesheet includes light theme treatments", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/error.css"),
        "utf8",
    );

    assert.match(source, /body\[data-theme="light"\] \.error-code/);
    assert.match(
        source,
        /body\[data-theme="light"\] \.error-content a\.error-dashboard-btn/,
    );
});

test("error page renders an escaped custom message from its route", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/error/index.js"),
        "utf8",
    );

    assert.match(source, /function resolveErrorMessage\(search\)/);
    assert.match(source, /get\("message"\)/);
    assert.match(source, /errorMessage \|\| i18n\.t\(descriptionKey\)/);
    assert.match(source, /escapeHtml\(description\)/);
});
