import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function walk(directory) {
    const discoveredFiles = [];
    for (const directoryEntry of readdirSync(directory)) {
        const entryPath = join(directory, directoryEntry);
        const entryStat = statSync(entryPath);
        if (entryStat.isDirectory()) discoveredFiles.push(...walk(entryPath));
        else discoveredFiles.push(entryPath);
    }
    return discoveredFiles;
}

const CSS_ROOTS = [join(ROOT, "src/ui/styles")];
const USAGE_ROOTS = [
    join(ROOT, "src/ui/app"),
    join(ROOT, "src/ui/layouts"),
    join(ROOT, "src/ui/reuse"),
    join(ROOT, "src/ui/public"),
    join(ROOT, "src/gateways"),
    join(ROOT, "src/adapters"),
];

function extractDefinedCssClasses() {
    const map = new Map();
    for (const root of CSS_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".css")) continue;
            const sourceText = readFileSync(file, "utf8");
            const stripped = sourceText
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/@import\s+url\([^)]*\)[^;]*;/g, "")
                .replace(/url\([^)]*\)/g, "");
            for (const match of stripped.matchAll(
                /\.([a-zA-Z][a-zA-Z0-9_-]*)/g,
            )) {
                const className = match[1];
                if (!map.has(className)) map.set(className, file);
            }
        }
    }
    return map;
}

// CSS classes whose names are assembled at runtime via string interpolation
// and therefore cannot be detected by static text search.
// Example: class="integrity-${row.status}" produces integrity-ok / mismatch / missing.
const DYNAMIC_CLASS_NAMES = new Set([
    "integrity-ok",
    "integrity-mismatch",
    "integrity-missing",
    "component-health-light--ok",
    "component-health-light--warning",
    "component-health-light--error",
    "popup-dialog--info",
    "popup-dialog--warning",
    "popup-dialog--danger",
    "popup-dialog--confirm",
    "language-javascript",
    "language-typescript",
    "language-json",
    "language-bash",
    "language-python",
    "language-sql",
    "language-html",
    "language-css",
    "language-plaintext",
]);

// Reuse module exports that are fully implemented but not yet wired up to
// any consuming page. Wire them up and remove from this list, or delete
// the export if it is no longer needed.
const PENDING_INTEGRATION_EXPORTS = new Set([]);

test("no dead CSS classes (defined but never referenced in scripts or templates)", () => {
    const cssDefinitions = extractDefinedCssClasses();

    const usageContent = USAGE_ROOTS.flatMap((root) =>
        walk(root).filter(
            (file) => file.endsWith(".js") || file.endsWith(".html"),
        ),
    )
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");

    const dead = [];
    for (const [className, definitionFile] of cssDefinitions) {
        if (DYNAMIC_CLASS_NAMES.has(className)) continue;
        if (!usageContent.includes(className)) {
            dead.push(`  .${className}  (defined in ${definitionFile})`);
        }
    }

    assert.equal(
        dead.length,
        0,
        `Dead CSS classes found (defined but never referenced in scripts or templates):\n${dead.join("\n")}`,
    );
});

test("no dead exports in reuse modules (exported but never imported by any page or layout)", () => {
    const reusePath = join(ROOT, "src/ui/reuse");
    const consumerRoots = [
        join(ROOT, "src/ui/app"),
        join(ROOT, "src/ui/layouts"),
        reusePath,
    ];

    const consumerContent = consumerRoots
        .flatMap((root) => walk(root).filter((file) => file.endsWith(".js")))
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");

    const dead = [];
    for (const file of walk(reusePath)) {
        if (!file.endsWith(".js")) continue;
        const sourceText = readFileSync(file, "utf8");
        for (const match of sourceText.matchAll(
            /^export\s+(?:async\s+)?function\s+(\w+)|^export\s+const\s+(\w+)/gm,
        )) {
            const name = match[1] ?? match[2];
            if (PENDING_INTEGRATION_EXPORTS.has(name)) continue;
            if (!consumerContent.includes(name)) {
                dead.push(`  ${name}  (from ${file})`);
            }
        }
    }

    assert.equal(
        dead.length,
        0,
        `Dead reuse exports found (exported but never imported):\n${dead.join("\n")}`,
    );
});
