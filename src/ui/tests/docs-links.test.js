import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../");
const OLD_DOC_FILE_URL_PATTERNS = [
    {
        label: "inline markdown link",
        pattern: /\[[^\]]+\]\((?!https?:)[^)]+\.md(?:[#?][^)]*)?\)/g,
    },
    {
        label: "reference markdown link",
        pattern: /^\s*\[[^\]]+\]:\s*(?!https?:)\S+\.md(?:[#?]\S*)?/gm,
    },
    {
        label: "HTML href",
        pattern: /href=["'](?!https?:)[^"']+\.md(?:[#?][^"']*)?["']/g,
    },
];

function listTrackedDocFiles() {
    return execFileSync("git", ["ls-files", "*.md", "*.html"], {
        cwd: ROOT,
        encoding: "utf8",
    })
        .trim()
        .split("\n")
        .filter(Boolean);
}

function lineNumberAt(content, index) {
    return content.slice(0, index).split("\n").length;
}

test("docs links use pretty docs URLs instead of markdown file URLs", () => {
    const offenders = [];
    for (const file of listTrackedDocFiles()) {
        const content = readFileSync(join(ROOT, file), "utf8");
        for (const { label, pattern } of OLD_DOC_FILE_URL_PATTERNS) {
            pattern.lastIndex = 0;
            for (const match of content.matchAll(pattern)) {
                offenders.push({
                    file,
                    line: lineNumberAt(content, match.index ?? 0),
                    label,
                    match: match[0],
                });
            }
        }
    }
    assert.deepEqual(offenders, []);
});

function firstMarkdownTitle(content) {
    return content
        .split("\n")
        .find((line) => line.startsWith("# "))
        ?.slice(2)
        .trim();
}

test("markdown document titles stay concise", () => {
    const longTitles = [];
    for (const file of listTrackedDocFiles().filter((name) =>
        name.endsWith(".md"),
    )) {
        const title = firstMarkdownTitle(
            readFileSync(join(ROOT, file), "utf8"),
        );
        if (title && title.length > 30) {
            longTitles.push({ file, length: title.length, title });
        }
    }
    assert.deepEqual(longTitles, []);
});

test("docs page strips pretty docs URL prefixes before loading document slugs", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes('.replace(/^docs\\/?/, "")'),
        "pretty /docs links are normalized to document slugs",
    );
    assert.match(source, /const slug = normalizeDocSlug\(href\);/);
});
