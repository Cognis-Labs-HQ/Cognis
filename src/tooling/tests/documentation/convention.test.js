import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

import {
    changelogFiles,
    changelogLinkIssues,
} from "../../reuse/documentation/content.js";

const ROOT = resolve(import.meta.dirname, "../../../..");

test("changelogs identify their feature branch and commits", () => {
    const violations = changelogFiles(ROOT).flatMap((path) => {
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

test("changelog link labels keep full SHAs in destinations only", () => {
    const sha = "1234567890abcdef1234567890abcdef12345678";
    const url = `https://github.com/Cognis-Labs-HQ/Cognis/commit/${sha}`;
    for (const valid of [
        `[${sha.slice(0, 7)}](${url})`,
        `[Grant enforcement](${url})`,
        `[${sha.slice(0, 7)}][implementation]\n[implementation]: ${url}`,
        `<a href="${url}">${sha.slice(0, 7)}</a>`,
    ])
        assert.deepEqual(changelogLinkIssues(valid), []);
    for (const label of [
        sha,
        `\`${sha}\``,
        `Commit ${sha}`,
        sha.toUpperCase(),
        sha + "abcdef",
    ]) {
        for (const invalid of [
            `[${label}](${url})`,
            `[${label}][implementation]\n[implementation]: ${url}`,
            `[${label}]: ${url}`,
            `<a href="${url}"><code>${label}</code></a>`,
        ])
            assert.ok(changelogLinkIssues(invalid).length, invalid);
    }
});

test("all shipped changelogs use concise link labels", () => {
    assert.deepEqual(
        changelogFiles(ROOT).flatMap((path) =>
            changelogLinkIssues(readFileSync(path, "utf8")).map(
                (issue) => `${relative(ROOT, path)}: ${issue}`,
            ),
        ),
        [],
    );
});
