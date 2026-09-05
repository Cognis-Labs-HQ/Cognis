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

function changelogFiles() {
    return readdirSync(resolve(ROOT, "src/docs/changelog"))
        .filter((name) => name.endsWith(".md"))
        .map((name) => resolve(ROOT, "src/docs/changelog", name));
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

test("Study language framework translations preserve contract parity", () => {
    const documents = ["de", "en", "id", "ja"].map((language) =>
        readFileSync(
            resolve(ROOT, `src/docs/study-language-framework.${language}.md`),
            "utf8",
        ),
    );
    const contractShape = (markdown) => ({
        sections: (markdown.match(/^## /gm) ?? []).length,
        checklistItems: (markdown.match(/^- /gm) ?? []).length,
        contractTerms: [
            ...new Set(
                [...markdown.matchAll(/`([^`]+)`/g)].map(([, value]) => value),
            ),
        ].sort(),
    });
    const expected = contractShape(documents[0]);
    for (const document of documents.slice(1)) {
        assert.deepEqual(contractShape(document), expected);
    }
});
