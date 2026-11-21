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
    contentIssues,
    documentationBundleFiles,
    sourceReferenceIssues,
} from "../../reuse/documentation/content.js";
import { validateMarkdown } from "../../reuse/documentation/validate.js";
import structure from "../../reuse/documentation/structure.json" with { type: "json" };

test("role sections require useful instructions rather than generic cross-references", () => {
    for (const [language, filler] of Object.entries({
        en: "The example uses the documented interface of Messages.",
        de: "Das Beispiel verwendet die dokumentierte Schnittstelle von Nachrichten.",
        id: "Contoh ini memakai antarmuka Pesan yang didokumentasikan.",
        ja: "この例は メッセージ の公開されたインターフェースを使います。",
    })) {
        const markdown = `# Messages\n\nRoom procedures.\n\n${structure[language].usage.map((heading) => `## ${heading}\n\n${filler}\n`).join("\n")}`;
        assert.ok(
            validateMarkdown(markdown, "usage", language).some((issue) =>
                issue.includes("component-specific"),
            ),
        );
    }
    assert.deepEqual(
        contentIssues(
            "Create a room, choose recipients, preview a draft and send. The acknowledged message appears in the selected room.",
        ),
        [],
    );
});

test("documentation may illustrate a rejected template inside a fenced example", () => {
    const example = [
        "```md",
        "The example uses the documented interface of Example.",
        "```",
    ].join("\n");
    const markdown = `# Writing Docs\n\nExamples of documentation authoring.\n\n${structure.en.technical.map((heading) => `## ${heading}\n\nUse the declared owner contract.\n`).join("\n")}\n${example}\n`;
    assert.deepEqual(validateMarkdown(markdown, "technical", "en"), []);
});

test("concrete source references track real files while illustrative API values remain unconstrained", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-doc-source-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(resolve(root, "src"));
    writeFileSync(
        resolve(root, "src/service.ts"),
        "export const version = 1;\n",
    );
    assert.deepEqual(
        sourceReferenceIssues(
            "Read `src/service.ts`; the example uses `provider.example`.",
            root,
        ),
        [],
    );
    assert.deepEqual(sourceReferenceIssues("Read `src/missing.ts`.", root), [
        "Documented source does not exist: src/missing.ts",
    ]);
});

test("GitHub file references follow the default branch while commit provenance stays immutable", () => {
    for (const prefix of [
        "https://github.com/example/project/blob/",
        "https://github.com/example/project/raw/",
        "https://raw.githubusercontent.com/example/project/",
    ]) {
        assert.deepEqual(
            sourceReferenceIssues(`${prefix}HEAD/src/service.ts#L10`, "/"),
            [],
        );
        for (const ref of ["a".repeat(40), "v1.0.0", "feature-example", "main"])
            assert.ok(
                sourceReferenceIssues(
                    `${prefix}${ref}/src/service.ts`,
                    "/",
                ).some((issue) => issue.includes("default branch")),
            );
    }
    assert.deepEqual(
        sourceReferenceIssues(
            "https://github.com/example/project/commit/abcdef123456",
            "/",
        ),
        [],
    );
});

test("published documentation references existing source and follows default branches", () => {
    const root = resolve(import.meta.dirname, "../../../..");
    const failures = documentationBundleFiles(root).flatMap((path) =>
        sourceReferenceIssues(readFileSync(path, "utf8"), root).map(
            (issue) => `${path}: ${issue}`,
        ),
    );
    assert.deepEqual(failures, []);
});
