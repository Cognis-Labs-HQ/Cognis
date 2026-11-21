import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");
function changelogFiles() {
    return readdirSync(resolve(ROOT, "src/docs/changelog"))
        .filter((name) => name.endsWith(".md"))
        .map((name) => resolve(ROOT, "src/docs/changelog", name));
}

test("changelogs identify their feature branch and commits", () => {
    const violations = changelogFiles().flatMap((path) => {
        const markdown = readFileSync(path, "utf8");
        const branchMatches = [
            ...markdown.matchAll(
                /^\*\*(?:Feature Branch|Feature-Zweig|Cabang Fitur|機能ブランチ):\*\*\s+(.+)$/gm,
            ),
        ];
        const branch = branchMatches[0]?.[1]?.trim();
        const hasCommitSection =
            /^## .*?(?:commits?|änderungen|komit|コミット).*$/im.test(markdown);
        const commitUrls = [
            ...markdown.matchAll(
                /https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/commit\/[0-9a-f]+/gi,
            ),
        ];
        const valid =
            branchMatches.length === 1 &&
            branch &&
            hasCommitSection &&
            (branch === "N/A"
                ? commitUrls.length === 0
                : commitUrls.length > 0);
        return valid ? [] : [relative(ROOT, path)];
    });
    assert.deepEqual(violations, []);
});

test("AI instructions document the complete changelog structure", () => {
    for (const path of [
        resolve(ROOT, "AGENTS.md"),
        resolve(ROOT, ".github/copilot-instructions.md"),
    ]) {
        const instructions = readFileSync(path, "utf8");
        assert.match(instructions, /`\*\*Feature Branch:\*\* \.\.\.`/);
        assert.match(instructions, /`## Commits`/);
        assert.match(instructions, /bookkeeping metadata/);
    }
});

test("AI instructions require tests to tolerate missing system binaries", () => {
    for (const path of [
        resolve(ROOT, "AGENTS.md"),
        resolve(ROOT, ".github/copilot-instructions.md"),
    ]) {
        const instructions = readFileSync(path, "utf8");
        assert.match(instructions, /Tests must never assume/);
        assert.match(instructions, /optional system binaries such as `git`/);
        assert.match(instructions, /skip with an explicit reason/);
    }
});
