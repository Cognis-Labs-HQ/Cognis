import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TEMPLATE = resolve(ROOT, ".github/DOCUMENTATION_TEMPLATE.en.md");

function markdownFiles(directory) {
    return readdirSync(directory).flatMap((name) => {
        const path = resolve(directory, name);
        if (statSync(path).isDirectory()) {
            if (path.includes(`${resolve(ROOT, "src/docs/changelog")}`))
                return [];
            return markdownFiles(path);
        }
        return name.endsWith(".md") && path.includes("/docs/") ? [path] : [];
    });
}

function headingLevels(path) {
    return readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => /^#{1,6} /.test(line))
        .map((line) => line.match(/^#+/)[0].length);
}

test("documentation follows the hidden heading convention", () => {
    const expected = headingLevels(TEMPLATE).slice(0, 3);
    const violations = markdownFiles(resolve(ROOT, "src")).flatMap((path) => {
        const actual = headingLevels(path).slice(0, expected.length);
        return actual.length === expected.length &&
            actual.every((level, index) => level === expected[index])
            ? []
            : [relative(ROOT, path)];
    });
    assert.deepEqual(violations, []);
});
