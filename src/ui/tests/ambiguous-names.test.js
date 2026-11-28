import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sourceFiles } from "../../tooling/reuse/component-files.js";
import { ambiguousNameIssues } from "../../tooling/reuse/ambiguous-names.js";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));

test("all core source bindings and table aliases use descriptive names", () => {
    const violations = [];
    for (const file of sourceFiles(sourceRoot, {
        excludeDirectories: ["node_modules", ".git", "dist"],
    })) {
        if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
        for (const issue of ambiguousNameIssues(readFileSync(file, "utf8")))
            violations.push(
                `${file}:${issue.line}: ambiguous ${issue.kind} '${issue.name}'`,
            );
    }
    assert.deepEqual(violations, [], violations.join("\n"));
});
