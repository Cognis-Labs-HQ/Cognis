import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
];

function extractDefinedCssClasses() {
    const map = new Map();
    for (const root of CSS_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".css")) continue;
            const src = readFileSync(file, "utf8");
            const stripped = src
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/@import\s+url\([^)]*\)[^;]*;/g, "");
            for (const m of stripped.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
                const cls = m[1];
                if (!map.has(cls)) map.set(cls, file);
            }
        }
    }
    return map;
}

// A valid CSS class name token: starts with a letter, ends with a letter/digit/underscore,
// and contains only letters, digits, hyphens, or underscores.
const CSS_IDENT = /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]$|^[a-zA-Z]$/;

// Inline CSS_IDENT as a capture group for use inside larger regex patterns.
const CSS_IDENT_CAPTURE = "([a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]|[a-zA-Z])";

function extractAppliedCssClasses(content) {
    const classes = new Set();

    const addTokens = (str) => {
        for (const tok of str.trim().split(/\s+/)) {
            if (CSS_IDENT.test(tok)) classes.add(tok);
        }
    };

    // Stop at `$` so that template-literal interpolations (${...}) are never read
    // as part of the class attribute value — e.g. class="tab ${active}" → only "tab".
    for (const m of content.matchAll(/\bclass="([^"$]*)/g)) addTokens(m[1]);
    for (const m of content.matchAll(/\bclass='([^'$]*)/g)) addTokens(m[1]);

    const identRe = new RegExp(`['"]${CSS_IDENT_CAPTURE}['"]`, "g");
    for (const m of content.matchAll(/classList\.(?:add|remove)\([^)]+\)/g)) {
        for (const arg of m[0].matchAll(identRe)) classes.add(arg[1]);
    }
    for (const m of content.matchAll(
        new RegExp(
            `classList\\.(?:toggle|contains)\\(\\s*['"]${CSS_IDENT_CAPTURE}['"]`,
            "g",
        ),
    )) {
        classes.add(m[1]);
    }

    for (const m of content.matchAll(/\bclassName\s*[=:]\s*['"]([^'"]+)['"]/g))
        addTokens(m[1]);

    for (const m of content.matchAll(
        /querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g,
    )) {
        for (const cm of m[1].matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g))
            classes.add(cm[1]);
    }

    return classes;
}

// CSS classes whose names are assembled at runtime via string interpolation
// and therefore cannot be detected by static text search.
// Example: class="integrity-${row.status}" produces integrity-ok / mismatch / missing.
const DYNAMIC_CLASS_NAMES = new Set([
    "integrity-ok",
    "integrity-mismatch",
    "integrity-missing",
]);

// CSS classes applied in HTML/JS that carry no styling by design: they serve
// as BEM structure markers, JS selector hooks, or semantic modifiers that
// are deliberately left unstyled. Remove from this list if styling is added.
const SELECTOR_HOOK_CLASSES = new Set([
    "admin-only",
    "app-page",
    "app-page__header",
    "app-page__main",
    "auth-page",
    "global-navrow-surface",
    "panel",
    "stack",
    "user-dropdown-content",
]);

test("no missing CSS definitions (class applied in scripts or templates but not defined in any stylesheet)", () => {
    const cssDefinitions = extractDefinedCssClasses();

    const appliedClasses = new Set();
    for (const root of USAGE_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".js") && !file.endsWith(".html")) continue;
            const content = readFileSync(file, "utf8");
            for (const cls of extractAppliedCssClasses(content))
                appliedClasses.add(cls);
        }
    }

    const missing = [];
    for (const cls of appliedClasses) {
        if (DYNAMIC_CLASS_NAMES.has(cls)) continue;
        if (SELECTOR_HOOK_CLASSES.has(cls)) continue;
        if (!cssDefinitions.has(cls)) {
            missing.push(
                `  .${cls}  (applied in scripts/templates but not defined in any stylesheet)`,
            );
        }
    }

    assert.equal(
        missing.length,
        0,
        `Missing CSS definitions:\n${missing.join("\n")}`,
    );
});

test("no missing named imports from relative modules", () => {
    const consumerRoots = [
        join(ROOT, "src/ui/app"),
        join(ROOT, "src/ui/layouts"),
        join(ROOT, "src/ui/reuse"),
    ];

    const missing = [];
    for (const root of consumerRoots) {
        for (const file of walk(root)) {
            if (!file.endsWith(".js")) continue;
            const src = readFileSync(file, "utf8");
            const fileDir = dirname(file);

            for (const m of src.matchAll(
                /^import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/gm,
            )) {
                const names = m[1]
                    .split(",")
                    .map((n) =>
                        n
                            .trim()
                            .replace(/\s+as\s+\w+$/, "")
                            .trim(),
                    )
                    .filter(Boolean);
                const relPath = m[2];
                const targetPath = resolve(fileDir, relPath);

                if (!existsSync(targetPath)) {
                    missing.push(
                        `  Module not found: ${relPath}  (imported from ${file})`,
                    );
                    continue;
                }

                const targetSrc = readFileSync(targetPath, "utf8");
                const exported = new Set(
                    [
                        ...targetSrc.matchAll(
                            /^export\s+(?:async\s+)?function\s+(\w+)|^export\s+(?:const|class)\s+(\w+)/gm,
                        ),
                    ].map((em) => em[1] ?? em[2]),
                );

                for (const name of names) {
                    if (!exported.has(name)) {
                        missing.push(
                            `  '${name}' is not exported by ${relPath}  (imported in ${file})`,
                        );
                    }
                }
            }
        }
    }

    assert.equal(
        missing.length,
        0,
        `Missing named imports from relative modules:\n${missing.join("\n")}`,
    );
});
