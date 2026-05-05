import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

const CSS_ROOTS = [join(ROOT, "src/ui/styles")];
const USAGE_ROOTS = [
    join(ROOT, "src/ui/app"),
    join(ROOT, "src/ui/layouts"),
    join(ROOT, "src/ui/reuse"),
    join(ROOT, "src/ui/public"),
    join(ROOT, "src/api/gateways"),
];

function extractDefinedCssClasses() {
    const map = new Map();
    for (const root of CSS_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".css")) continue;
            const src = readFileSync(file, "utf8");
            const stripped = src
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/@import\s+url\([^)]*\)[^;]*;/g, "")
                .replace(/url\([^)]*\)/g, "");
            for (const m of stripped.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
                const cls = m[1];
                if (!map.has(cls)) map.set(cls, file);
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
    "popup-dialog--info",
    "popup-dialog--warning",
    "popup-dialog--danger",
    "popup-dialog--confirm",
]);

// Reuse module exports that are fully implemented but not yet wired up to
// any consuming page. Wire them up and remove from this list, or delete
// the export if it is no longer needed.
const PENDING_INTEGRATION_EXPORTS = new Set([]);

test("no dead CSS classes (defined but never referenced in scripts or templates)", () => {
    const cssDefinitions = extractDefinedCssClasses();

    const usageContent = USAGE_ROOTS.flatMap((root) =>
        walk(root).filter((f) => f.endsWith(".js") || f.endsWith(".html")),
    )
        .map((f) => readFileSync(f, "utf8"))
        .join("\n");

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
        .flatMap((root) => walk(root).filter((f) => f.endsWith(".js")))
        .map((f) => readFileSync(f, "utf8"))
        .join("\n");

    const dead = [];
    for (const file of walk(reusePath)) {
        if (!file.endsWith(".js")) continue;
        const src = readFileSync(file, "utf8");
        for (const m of src.matchAll(
            /^export\s+(?:async\s+)?function\s+(\w+)|^export\s+const\s+(\w+)/gm,
        )) {
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
        `Dead reuse exports found (exported but never imported):\n${dead.join("\n")}`,
    );
});
