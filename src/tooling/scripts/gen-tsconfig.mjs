/**
 * Generates the root tsconfig.json by scanning src/ for all subdirectories that
 * contain a tsconfig.json with "composite": true. This avoids maintaining a
 * hand-edited list of project references whenever a gateway, adapter, or other
 * component is added or removed.
 *
 * Usage:
 *   node src/tooling/scripts/gen-tsconfig.mjs
 *
 * The generated file is written to tsconfig.json at the repository root. Run this
 * script before tsc to ensure the reference list is current.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);
const srcRoot = path.join(repoRoot, "src");

function findCompositeProjects(dir) {
    const results = [];
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return results;
    }
    const tsconfigPath = path.join(dir, "tsconfig.json");
    let isComposite = false;
    try {
        const parsed = JSON.parse(readFileSync(tsconfigPath, "utf8"));
        isComposite = parsed?.compilerOptions?.composite === true;
    } catch {
        isComposite = false;
    }
    if (isComposite) {
        results.push(path.relative(repoRoot, dir));
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry);
        try {
            if (statSync(full).isDirectory() && entry !== "node_modules") {
                results.push(...findCompositeProjects(full));
            }
        } catch {
            continue;
        }
    }
    return results;
}

const projects = findCompositeProjects(srcRoot).sort();

const tsconfig = {
    extends: "./tsconfig.base.json",
    files: [],
    references: projects.map((p) => ({ path: `./${p}` })),
};

const output = JSON.stringify(tsconfig, null, 4) + "\n";
writeFileSync(path.join(repoRoot, "tsconfig.json"), output, "utf8");

console.log(
    `tsconfig.json updated with ${projects.length} project reference(s).`,
);
