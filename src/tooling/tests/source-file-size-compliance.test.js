import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { execFileSync } from "node:child_process";
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

test("source and data files remain below the reviewable line limit", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter(Boolean);
    const oversized = tracked.flatMap((filePath) => {
        if (
            GENERATED_FILES.has(filePath) ||
            !existsSync(filePath) ||
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
