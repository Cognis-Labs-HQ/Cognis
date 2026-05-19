import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) out.push(...walk(fullPath));
        else out.push(fullPath);
    }
    return out;
}

const SCAN_ROOTS = [
    join(ROOT, "src/ui/app"),
    join(ROOT, "src/ui/reuse"),
    join(ROOT, "src/ui/layouts"),
    join(ROOT, "src/api"),
    join(ROOT, "src/core"),
    join(ROOT, "src/adapters"),
    join(ROOT, "src/tooling"),
];

// Short names (1–2 letters) acceptable as standalone variable declarations.
// x, y: spatial coordinates; w, h: layout width/height; _: intentional ignore;
// id: universally understood identifier.
const ALLOWED_STANDALONE = new Set(["x", "y", "w", "h", "_", "id"]);

// Short names (1–2 letters) acceptable only as the loop counter in a numeric
// for-loop initialiser (e.g. `for (let i = 0; ...)`) or a for-of/for-in
// binding. r and c are row/column indices used in nested grid-cell iterations,
// which follow the same convention as i/j/k. id is allowed when iterating a
// collection of identifiers.
const ALLOWED_COUNTER = new Set(["i", "j", "k", "r", "c", "id"]);

// Matches the counter variable in a numeric for-loop initialiser.
// Captures the variable name at group 2 (1–2 letters).
const FOR_COUNTER_RE = /^\s*for\s*\(\s*(let|var)\s+([a-zA-Z]{1,2})\s*=/;

// Matches the binding in a for-of or for-in loop.
// Captures the variable name at group 2 (1–2 letters).
const FOR_OF_IN_RE =
    /^\s*for\s*\(\s*(const|let|var)\s+([a-zA-Z]{1,2})\s+(of|in)\s/;

// Matches a plain variable declaration.
// Captures the variable name at group 2 (1–2 letters).
const DECL_RE = /^\s*(const|let|var)\s+([a-zA-Z]{1,2})\s*=/;

test("no ambiguous short variable names in source files", () => {
    const hits = [];

    for (const root of SCAN_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;

            const lines = readFileSync(file, "utf8").split("\n");
            // Tracks whether the previous meaningful line opened a multi-line
            // for loop (i.e. `for (` with nothing following the paren).
            let prevLineWasForOpen = false;
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const trimmed = line.trimStart();

                if (trimmed.startsWith("//") || trimmed.startsWith("*"))
                    continue;

                let name = null;
                let isCounter = false;

                // Detect multi-line for-loop initialisers: when Prettier
                // formats `for (let c = ...)` across lines, the declaration
                // appears alone on the next line after `for (`.
                if (prevLineWasForOpen) {
                    const initMatch =
                        /^\s*(let|var)\s+([a-zA-Z]{1,2})\s*=/.exec(line);
                    if (initMatch) {
                        name = initMatch[2];
                        isCounter = true;
                    }
                }

                if (!name) {
                    const counterMatch = FOR_COUNTER_RE.exec(line);
                    if (counterMatch) {
                        name = counterMatch[2];
                        isCounter = true;
                    } else {
                        const forOfInMatch = FOR_OF_IN_RE.exec(line);
                        if (forOfInMatch) {
                            // for-of/for-in bindings use the same short-name
                            // conventions as numeric counters (i, j, k, r, c).
                            name = forOfInMatch[2];
                            isCounter = true;
                        } else {
                            const declMatch = DECL_RE.exec(line);
                            if (declMatch) {
                                name = declMatch[2];
                            }
                        }
                    }
                }

                prevLineWasForOpen = /^\s*for\s*\(\s*$/.test(line);

                if (!name) continue;

                if (isCounter) {
                    if (ALLOWED_COUNTER.has(name)) continue;
                    hits.push(
                        `${file}:${lineIndex + 1}: ambiguous for-loop counter '${name}'`,
                    );
                } else {
                    if (ALLOWED_STANDALONE.has(name)) continue;
                    hits.push(
                        `${file}:${lineIndex + 1}: ambiguous variable name '${name}'`,
                    );
                }
            }
        }
    }

    assert.equal(
        hits.length,
        0,
        `Ambiguous single-letter variable names found:\n${hits.join("\n")}`,
    );
});
