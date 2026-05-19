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
    return execFileSync(
        "git",
        [
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "*.md",
            "*.html",
        ],
        {
            cwd: ROOT,
            encoding: "utf8",
        },
    )
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

function localizedDocGroup(file) {
    const match = file.match(/^(.*)\.(de|en|id|ja)\.md$/);
    if (!match) return null;
    return { stem: `${match[1]}.md`, lang: match[2] };
}

test("localized docs stay in language lockstep", () => {
    const groups = new Map();
    for (const file of listTrackedDocFiles().filter((name) =>
        name.endsWith(".md"),
    )) {
        const group = localizedDocGroup(file);
        if (!group) continue;
        if (!groups.has(group.stem)) groups.set(group.stem, new Set());
        groups.get(group.stem).add(group.lang);
    }

    const incompleteGroups = [];
    for (const [stem, languages] of groups) {
        const missing = ["de", "en", "id", "ja"].filter(
            (lang) => !languages.has(lang),
        );
        if (missing.length > 0) incompleteGroups.push({ stem, missing });
    }
    assert.deepEqual(incompleteGroups, []);
});

test("unsuffixed markdown docs have localized variants", () => {
    const trackedDocs = listTrackedDocFiles().filter((name) =>
        name.endsWith(".md"),
    );
    const trackedDocSet = new Set(trackedDocs);
    const unsuffixedDocs = trackedDocs.filter(
        (name) => !/\.(de|en|id|ja)\.md$/.test(name),
    );
    const exemptUnsuffixedDocs = new Set([".github/copilot-instructions.md"]);
    const missingExemptions = [...exemptUnsuffixedDocs].filter(
        (file) => !trackedDocSet.has(file),
    );
    assert.deepEqual(missingExemptions, []);
    const missingLocalizedVariants = [];

    for (const unsuffixedDoc of unsuffixedDocs) {
        if (exemptUnsuffixedDocs.has(unsuffixedDoc)) {
            continue;
        }
        const missingLanguages = ["de", "en", "id", "ja"].filter(
            (languageCode) =>
                !trackedDocSet.has(
                    unsuffixedDoc.replace(/\.md$/, `.${languageCode}.md`),
                ),
        );
        if (missingLanguages.length > 0) {
            missingLocalizedVariants.push({
                file: unsuffixedDoc,
                missingLanguages,
            });
        }
    }

    assert.deepEqual(missingLocalizedVariants, []);
});

test("docs page strips pretty docs URL prefixes before loading document slugs", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes('.replace(/^docs\\/?/, "")'),
        "pretty /docs links are normalized to document slugs",
    );
    assert.match(source, /const slug = normalizeDocSlug\(href\);/);
});

test("docs page excludes changelog entries from navigation menu", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes("function isChangelogDoc(item)"),
        "docs page should classify changelog slugs",
    );
    assert.ok(
        source.includes("docs.filter((doc) => !isChangelogDoc(doc))"),
        "docs navigation should exclude changelog docs",
    );
    assert.ok(
        source.includes("resolveDefaultSlug(subpath, navigationDocs)"),
        "docs default selection should only consider non-changelog docs",
    );
});

test("docs page falls back ungrouped docs to the platform section", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes('const groupKey = item.group || "platform";'),
        "docs navigation should assign ungrouped docs to platform",
    );
});

test("docs page keeps docs-specific stylesheet enabled", () => {
    const html = readFileSync(
        join(ROOT, "src/ui/public/pages/docs.html"),
        "utf8",
    );
    assert.match(html, /\/static\/styles\/docs\.css/);
});

test("changelogs page keeps docs-specific stylesheet and dedicated script enabled", () => {
    const html = readFileSync(
        join(ROOT, "src/ui/public/pages/changelogs.html"),
        "utf8",
    );
    assert.match(html, /\/static\/styles\/docs\.css/);
    assert.match(html, /\/static\/app\/changelogs\/index\.js/);
});

test("changelogs page keeps changelog-only navigation data", () => {
    const source = readFileSync(
        join(ROOT, "src/ui/app/changelogs/index.js"),
        "utf8",
    );
    assert.ok(
        source.includes("docs.filter((doc) => isChangelogDoc(doc))"),
        "changelogs page navigation should include only changelog docs",
    );
    assert.ok(
        source.includes("applyDocumentTitle(i18n, \"ui.page.title.changelogs\")"),
        "changelogs page should apply the dedicated page title",
    );
});

test("docs markdown titles stay within 30 characters", () => {
    const docs = listTrackedDocFiles().filter(
        (file) => file.startsWith("src/docs/") && file.endsWith(".md"),
    );
    const offenders = [];
    for (const file of docs) {
        const content = readFileSync(join(ROOT, file), "utf8");
        const headingLine = content
            .split("\n")
            .find((line) => line.startsWith("# "));
        if (!headingLine) continue;
        const title = headingLine.slice(2).trim();
        if (title.length > 30) {
            offenders.push({ file, title, length: title.length });
        }
    }
    assert.deepEqual(offenders, []);
});
