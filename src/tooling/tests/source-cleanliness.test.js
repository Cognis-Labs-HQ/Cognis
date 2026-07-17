import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, "src/modules/nextcloud-whiteboard");
const MAX_SOURCE_LINES = 1000;
const checkedExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
    "node_modules",
    ".git",
    "coverage",
    "dist",
    "build",
]);

test("Nextcloud Whiteboard source files stay within the 1000 line component limit", async () => {
    const oversizedFiles = [];
    for await (const filePath of walkSourceFiles(SOURCE_ROOT)) {
        const lineCount = (await readFile(filePath, "utf8")).split("\n").length;
        if (lineCount > MAX_SOURCE_LINES) {
            oversizedFiles.push(
                `${path.relative(ROOT, filePath)} has ${lineCount} lines`,
            );
        }
    }
    assert.deepEqual(oversizedFiles, []);
});

test("Nextcloud Whiteboard UI does not add pure pass-through shim functions", async () => {
    const shimFunctions = [];
    for (const filePath of [
        path.join(SOURCE_ROOT, "ui/app/index.js"),
        path.join(SOURCE_ROOT, "ui/admin-section.js"),
        path.join(SOURCE_ROOT, "ui/whiteboard/canvas.js"),
    ]) {
        const source = await readFile(filePath, "utf8");
        for (const match of source.matchAll(
            /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*{([\s\S]*?)}/g,
        )) {
            const bodyLines = match[3]
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
            if (bodyLines.length > 2) continue;
            const statement = bodyLines
                .join(" ")
                .replace(/^return\s+/, "")
                .replace(/;$/, "");
            const call = statement.match(
                /^([A-Za-z_$][\w$?.]*)\(([^(){};]*)\)$/,
            );
            if (!call) continue;
            const parameters = match[2]
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            const callArguments = call[2]
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            if (
                parameters.length === callArguments.length &&
                parameters.every((item, index) => item === callArguments[index])
            ) {
                shimFunctions.push(
                    `${path.relative(ROOT, filePath)}: ${match[1]}`,
                );
            }
        }
    }
    assert.deepEqual(shimFunctions, []);
});

async function* walkSourceFiles(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (ignoredDirectories.has(entry.name)) continue;
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            yield* walkSourceFiles(entryPath);
        } else if (
            entry.isFile() &&
            checkedExtensions.has(path.extname(entry.name))
        ) {
            yield entryPath;
        }
    }
}
