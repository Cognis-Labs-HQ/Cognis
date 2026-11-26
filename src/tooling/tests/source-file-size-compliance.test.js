import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const MAX_SOURCE_LINES = 950;
const CHECKED_EXTENSIONS = new Set([
    ".css",
    ".js",
    ".json",
    ".md",
    ".ts",
    ".xml",
]);
const GENERATED_FILES = new Set(["package-lock.json"]);
const EXCLUDED_DIRECTORIES = new Set([
    ".git",
    ".cache",
    "coverage",
    "dist",
    "node_modules",
]);

function sourceFiles(directory = ".") {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filePath = join(directory, entry.name);
        if (entry.isDirectory()) {
            return EXCLUDED_DIRECTORIES.has(entry.name)
                ? []
                : sourceFiles(filePath);
        }
        return entry.isFile() ? [filePath.replace(/^\.\//, "")] : [];
    });
}

test("source and data files remain below the reviewable line limit", () => {
    const oversized = sourceFiles().flatMap((filePath) => {
        if (
            GENERATED_FILES.has(filePath) ||
            !CHECKED_EXTENSIONS.has(extname(filePath))
        )
            return [];
        const lineCount = readFileSync(filePath, "utf8").split("\n").length - 1;
        return lineCount > MAX_SOURCE_LINES
            ? [`${filePath} (${lineCount} lines)`]
            : [];
    });
    assert.deepEqual(oversized, []);
});
