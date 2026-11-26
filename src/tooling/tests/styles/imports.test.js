import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { sourceFiles } from "../../reuse/component-files.js";
import { stylesheetImportIssues } from "../../reuse/styles/imports.js";

const ROOT = resolve(import.meta.dirname, "../../../..");

test("shipping stylesheets keep import blocks contiguous and alphabetically sorted", () => {
    const failures = sourceFiles(resolve(ROOT, "src"))
        .filter((path) => path.endsWith(".css"))
        .flatMap((path) =>
            stylesheetImportIssues(readFileSync(path, "utf8")).map(
                (issue) => `${relative(ROOT, path)}: ${issue}`,
            ),
        );
    assert.deepEqual(failures, []);
});

test("stylesheet conventions reject split, unsorted and repeated imports", () => {
    const valid =
        '@import url("a.css");\n@import url("b.css");\n\n.example { color: red; }\n';
    assert.deepEqual(stylesheetImportIssues(valid), []);
    for (const invalid of [
        valid.replace('"a.css"', '"z.css"'),
        valid.replace(";\n@import", ";\n\n@import"),
        valid.replace('"b.css"', '"a.css"'),
        valid.replace(";\n\n.example", ";\n.example"),
        valid.replace(";\n\n.example", ";\n\n\n.example"),
    ])
        assert.ok(stylesheetImportIssues(invalid).length > 0);
});

test("quoted import URLs may contain semicolons without splitting a statement", () => {
    assert.deepEqual(
        stylesheetImportIssues(
            '@import url("https://example.test/fonts?family=Example:wght@400;700");\n\n.example { font-size: 1rem; }\n',
        ),
        [],
    );
});
