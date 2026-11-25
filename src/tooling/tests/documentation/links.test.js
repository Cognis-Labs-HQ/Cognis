import test from "node:test";
import assert from "node:assert/strict";
import {
    mkdtempSync,
    mkdirSync,
    writeFileSync,
    rmSync,
    readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
    documentationTargets,
    documentationLinkIssues,
} from "../../reuse/documentation/links.js";
import {
    documentationBundleFiles,
    sourceReferenceIssues,
    contentIssues,
} from "../../reuse/documentation/content.js";

const root = resolve(import.meta.dirname, "../../../..");

test("published document links resolve to real topic bundles and public manifest owners", () => {
    const targets = documentationTargets(root);
    assert.deepEqual(
        documentationBundleFiles(root).flatMap((path) =>
            documentationLinkIssues(readFileSync(path, "utf8"), targets).map(
                (issue) => `${path}: ${issue}`,
            ),
        ),
        [],
    );
});

test("documentation links validate topics, views and source files against the current repository", (context) => {
    const directory = mkdtempSync(resolve(tmpdir(), "cognis-doc-links-"));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const path of ["src/docs", "src/docs/api", "src/core"])
        mkdirSync(resolve(directory, path), { recursive: true });
    writeFileSync(resolve(directory, "src/docs/INFO.en.md"), "# Root\n");
    writeFileSync(resolve(directory, "src/docs/api/INFO.en.md"), "# API\n");
    writeFileSync(
        resolve(directory, "src/core/package.json"),
        JSON.stringify({
            name: "@cognis/core",
            documentation: {
                readme: "docs/README.en.md",
                usage: "docs/USAGE.en.md",
                technical: "docs/TECHNICAL.en.md",
            },
        }),
    );
    writeFileSync(resolve(directory, "src/core/index.ts"), "export {};\n");
    const targets = documentationTargets(directory);
    for (const path of [
        "/docs",
        "/docs/api/usage",
        "/docs/latest/components/core/technical",
        "/docs/1.0.0/api?langs=ja",
        "/docs/%61pi/technical",
    ])
        assert.deepEqual(
            documentationLinkIssues(`[Reference](${path})`, targets),
            [],
        );
    for (const path of ["/docs/unknown", "/docs/api/unknown", "/docs/api%ZZ"])
        assert.ok(
            documentationLinkIssues(`[Reference](${path})`, targets).length,
            path,
        );
    const prefix = "https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/";
    assert.deepEqual(
        sourceReferenceIssues(
            `[Source](${prefix}src/core/index.ts#L1)`,
            directory,
        ),
        [],
    );
    assert.ok(
        sourceReferenceIssues(
            `[Source](${prefix}src/core/missing.ts)`,
            directory,
        ).some((issue) => issue.includes("does not exist")),
    );
});

test("reference prose describes the current contract without release comparisons", () => {
    for (const prose of [
        "The browser now uses the shared renderer.",
        "Older servers still work with this client.",
        "The module no longer imports a private implementation.",
        "Document bundles retain the same topic slugs.",
        "The URLs are stable after this rename.",
        "Jetzt verwendet die Seite ein neues Layout.",
        "Sekarang menggunakan tampilan baru.",
        "新しい表示を使用するようになりました。",
    ])
        assert.ok(contentIssues(prose).length, prose);
    for (const prose of [
        "PATCH preserves omitted fields unchanged.",
        "The worker returns cached public assets while refreshing them online.",
        "GET reads a versioned localized document.",
    ])
        assert.deepEqual(contentIssues(prose), []);
});
