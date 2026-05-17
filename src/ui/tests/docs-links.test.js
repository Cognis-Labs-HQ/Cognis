import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../");
const DOC_LINK_PATTERN = /\[[^\]]+\]\((?!https?:)[^)]+\.md(?:[#?][^)]*)?\)/;

test("docs markdown links use pretty docs URLs instead of language-suffixed markdown files", () => {
    const files = execFileSync("git", ["ls-files", "*.md"], {
        cwd: ROOT,
        encoding: "utf8",
    })
        .trim()
        .split("\n")
        .filter(Boolean);
    const offenders = files.filter((file) =>
        DOC_LINK_PATTERN.test(readFileSync(join(ROOT, file), "utf8")),
    );
    assert.deepEqual(offenders, []);
});

test("docs page strips pretty docs URL prefixes before loading document slugs", () => {
    const source = readFileSync(join(ROOT, "src/ui/app/docs/index.js"), "utf8");
    assert.ok(
        source.includes('.replace(/^docs\\/?/, "")'),
        "pretty /docs links are normalized to document slugs",
    );
    assert.match(source, /const slug = normalizeDocSlug\(href\);/);
});
