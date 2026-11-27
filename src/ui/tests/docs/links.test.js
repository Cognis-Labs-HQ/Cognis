import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { linkShortCommitRefs as linkShortCommitReferences } from "../../reuse/commit-links.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const OLD_DOCUMENT_FILE_URL_PATTERNS = [
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

function listTrackedDocumentFiles() {
    const discoveredFiles = [];
    const pendingDirectories = [ROOT];

    while (pendingDirectories.length > 0) {
        const currentDirectory = pendingDirectories.pop();
        for (const entry of readdirSync(currentDirectory, {
            withFileTypes: true,
        })) {
            if ([".git", "node_modules", "dist"].includes(entry.name)) {
                continue;
            }
            const absolutePath = join(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                pendingDirectories.push(absolutePath);
                continue;
            }
            if (!entry.isFile() && !entry.isSymbolicLink()) {
                continue;
            }
            if (!entry.name.endsWith(".md") && !entry.name.endsWith(".html")) {
                continue;
            }
            discoveredFiles.push(
                relative(ROOT, absolutePath).replaceAll("\\", "/"),
            );
        }
    }

    return discoveredFiles.sort();
}

function lineNumberAt(content, index) {
    return content.slice(0, index).split("\n").length;
}

test("docs links use pretty docs URLs instead of markdown file URLs", () => {
    const offenders = [];
    for (const file of listTrackedDocumentFiles()) {
        const content = readFileSync(join(ROOT, file), "utf8");
        for (const { label, pattern } of OLD_DOCUMENT_FILE_URL_PATTERNS) {
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

function localizedDocumentGroup(file) {
    const match = file.match(/^(.*)\.(de|en|id|ja)\.md$/);
    if (!match) return null;
    return { stem: `${match[1]}.md`, lang: match[2] };
}

test("localized docs stay in language lockstep", () => {
    const groups = new Map();
    for (const file of listTrackedDocumentFiles().filter((name) =>
        name.endsWith(".md"),
    )) {
        const group = localizedDocumentGroup(file);
        if (!group) continue;
        if (!groups.has(group.stem)) groups.set(group.stem, new Set());
        groups.get(group.stem).add(group.lang);
    }

    const incompleteGroups = [];
    for (const [stem, languages] of groups) {
        const missing = ["de", "en", "id", "ja"].filter(
            (language) => !languages.has(language),
        );
        if (missing.length > 0) incompleteGroups.push({ stem, missing });
    }
    assert.deepEqual(incompleteGroups, []);
});

test("unsuffixed markdown docs have localized variants", () => {
    const trackedDocuments = listTrackedDocumentFiles().filter((name) =>
        name.endsWith(".md"),
    );
    const trackedDocumentSet = new Set(trackedDocuments);
    const unsuffixedDocuments = trackedDocuments.filter(
        (name) => !/\.(de|en|id|ja)\.md$/.test(name),
    );
    const exemptUnsuffixedDocuments = new Set([
        ".github/copilot-instructions.md",
        "AGENTS.md",
        "TODO.md",
    ]);
    const missingExemptions = [...exemptUnsuffixedDocuments].filter(
        (file) => !trackedDocumentSet.has(file),
    );
    assert.deepEqual(missingExemptions, []);
    const missingLocalizedVariants = [];

    for (const unsuffixedDocument of unsuffixedDocuments) {
        if (exemptUnsuffixedDocuments.has(unsuffixedDocument)) {
            continue;
        }
        const missingLanguages = ["de", "en", "id", "ja"].filter(
            (languageCode) =>
                !trackedDocumentSet.has(
                    unsuffixedDocument.replace(/\.md$/, `.${languageCode}.md`),
                ),
        );
        if (missingLanguages.length > 0) {
            missingLocalizedVariants.push({
                file: unsuffixedDocument,
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
    assert.match(source, /const slug = normalizeDocumentSlug\(href\);/);
});

test("docs page excludes changelog entries from navigation menu", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes("function isChangelogDocument(item)"),
        "docs page should classify changelog slugs",
    );
    assert.ok(
        /documents\.filter\(\s*\(document\) => !isChangelogDocument\(document\),?\s*\)/.test(
            source,
        ),
        "docs navigation should exclude changelog docs",
    );
    assert.ok(
        source.includes("resolveDefaultSlug(subpath, navigationDocuments)"),
        "docs default selection should only consider non-changelog docs",
    );
});

test("docs page falls back ungrouped docs to the platform section", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes('const groupKey = item.group || "platform";'),
        "docs navigation should assign ungrouped docs to platform",
    );
    assert.match(source, /createSideMenu\(/);
    assert.match(source, /createNavigationGroups\(i18n, navigationDocuments\)/);
});

test("docs and changelogs use the shared side menu capability", () => {
    const documentsSource = readFileSync(
        join(ROOT, "src/ui/app/docs/index.js"),
        "utf8",
    );
    const changelogSource = readFileSync(
        join(ROOT, "src/ui/app/changelogs/index.js"),
        "utf8",
    );
    for (const source of [documentsSource, changelogSource]) {
        assert.match(source, /createSideMenu\(/);
        assert.match(source, /navigationMenu\.mount\(root, \{ signal \}\)/);
        assert.match(source, /navigationMenu\.setActive\(slug\)/);
    }
});

test("docs page keeps docs-specific stylesheet enabled", () => {
    const html = readFileSync(
        join(ROOT, "src/ui/public/pages/docs.html"),
        "utf8",
    );
    assert.match(html, /\/static\/styles\/docs\.css/);
});

test("docs page template includes docs stylesheet and docs entry script", () => {
    const html = readFileSync(
        join(ROOT, "src/ui/public/pages/docs.html"),
        "utf8",
    );
    assert.match(html, /\/static\/styles\/docs\.css/);
    assert.match(html, /\/static\/app\/docs\/index\.js/);
});

test("changelogs module keeps changelog-only navigation data", () => {
    const source = readFileSync(
        join(ROOT, "src/ui/app/changelogs/index.js"),
        "utf8",
    );
    assert.ok(
        /documents\.filter\(\s*\(document\) =>\s*isChangelogDocument\(document\),?\s*\)/.test(
            source,
        ),
        "changelogs page navigation should include only changelog docs",
    );
    assert.ok(
        source.includes('applyDocumentTitle(i18n, "ui.page.title.changelogs")'),
        "changelogs page should apply the dedicated page title",
    );
    assert.ok(
        source.includes("changelog-content-panel"),
        "changelogs page should scope content-list styling to the reader panel",
    );
    assert.ok(
        source.includes("item.sourceName || CHANGELOG_GROUP_KEY"),
        "changelog navigation should group external module entries by module name",
    );
    assert.match(source, /transformMarkdown: linkShortCommitReferences/);

    const styles = readFileSync(join(ROOT, "src/ui/styles/docs.css"), "utf8");
    assert.ok(
        styles.includes(".changelog-content-panel > ul > li > a"),
        "changelog content links should render as styled cards instead of a plain list",
    );
});

test("changelog navigation delegates structured module groups to the side menu", () => {
    const source = readFileSync(
        join(ROOT, "src/ui/app/changelogs/index.js"),
        "utf8",
    );
    assert.match(source, /createNavigationGroups\(i18n, changelogDocuments\)/);
    assert.match(source, /group === CHANGELOG_GROUP_KEY/);
    assert.match(source, /items: groupItems\.map/);
});

test("changelog commit links show short refs with complete hrefs", () => {
    const commitReference = "1234567890abcdef1234567890abcdef12345678";
    const url = `https://github.com/Cognis-Labs-HQ/Cognis/commit/${commitReference}`;
    assert.equal(linkShortCommitReferences(url), `[1234567](${url})`);
    assert.equal(
        linkShortCommitReferences(`[complete commit reference](${url})`),
        `[1234567](${url})`,
    );
});

test("documentation markdown titles stay within 30 characters", () => {
    const documents = listTrackedDocumentFiles().filter(
        (file) =>
            (file.startsWith("src/docs/") || file.includes("/docs/")) &&
            !file.includes("/changelog/") &&
            file.endsWith(".md"),
    );
    const offenders = [];
    for (const file of documents) {
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
