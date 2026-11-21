import {
    componentManifestFiles,
    sourceFiles,
} from "../../reuse/component-files.js";
import { duplicateTechnicalParagraphs } from "../../reuse/documentation/duplicates.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    mkdtempSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
    validateComponent,
    validateMarkdown,
    validateChangelogChanges,
    documentName,
    languages,
    documents,
    validateCoreDocumentation,
} from "../../reuse/documentation/validate.js";
import structure from "../../reuse/documentation/structure.json" with { type: "json" };

const ROOT = resolve(import.meta.dirname, "../../../..");

function markdown(kind, language = "en") {
    return `# Example\n\nA useful introduction for the component.\n\n${structure[language][kind].map((heading) => `## ${heading}\n\nConcrete instructions and expected behavior.\n`).join("\n")}`;
}

test("every shipped component declares its complete localized documentation bundle", () => {
    const failures = componentManifestFiles(ROOT).flatMap((manifest) =>
        validateComponent(
            manifest,
            manifest === resolve(ROOT, "package.json") ? "src/docs" : "docs",
        ).map((issue) => `${manifest}: ${issue}`),
    );
    assert.deepEqual(failures, []);
});

for (const language of languages) {
    for (const kind of Object.keys(documents)) {
        test(`${kind} rejects structural drift in ${language}`, () => {
            const valid = markdown(kind, language);
            assert.deepEqual(validateMarkdown(valid, kind, language), []);
            for (const invalid of [
                valid + "\n## Extra Section\n\nAn appended update.\n",
                valid.replace(
                    structure[language][kind][0],
                    structure[language][kind][1],
                ),
                valid.replace(
                    "Concrete instructions and expected behavior.",
                    "",
                ),
                valid.replace("A useful introduction for the component.", ""),
                valid + "\n# Another Title\n",
                valid.replace(
                    "Concrete instructions and expected behavior.",
                    "TODO",
                ),
                valid + "\nThis PR fixes the old behavior.\n",
                valid + "\n```sh\nunclosed code\n",
            ])
                assert.ok(
                    validateMarkdown(invalid, kind, language).length > 0,
                    invalid,
                );
        });
    }
}

test("readmes keep endpoint specifications and implementation code in Technical", () => {
    for (const addition of [
        "\nGET /api/v1/example\n",
        "\n```ts\nctx.capabilities.require('example');\n```\n",
    ])
        assert.ok(
            validateMarkdown(markdown("readme") + addition, "readme", "en")
                .length,
        );
});

test("component manifests cannot point outside their owned bundle or omit a translation", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-doc-contract-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(resolve(root, "docs"));
    const manifest = resolve(root, "manifest.json");
    const pointers = Object.fromEntries(
        Object.entries(documents).map(([kind, name]) => [
            kind,
            `docs/${name}.en.md`,
        ]),
    );
    writeFileSync(manifest, JSON.stringify({ documentation: pointers }));
    for (const kind of Object.keys(documents))
        for (const language of languages)
            writeFileSync(
                resolve(root, "docs", documentName(kind, language)),
                markdown(kind, language),
            );
    assert.deepEqual(validateComponent(manifest), []);
    rmSync(resolve(root, "docs", "USAGE.ja.md"));
    assert.ok(
        validateComponent(manifest).some((issue) =>
            issue.includes("USAGE.ja.md"),
        ),
    );
    writeFileSync(
        manifest,
        JSON.stringify({
            documentation: {
                ...pointers,
                technical: "../other/TECHNICAL.en.md",
            },
        }),
    );
    assert.ok(
        validateComponent(manifest).some((issue) =>
            issue.includes("Invalid documentation.technical"),
        ),
    );
    writeFileSync(resolve(root, "docs", "journal.md"), "# Journal\n");
    assert.ok(
        validateComponent(manifest).some((issue) =>
            issue.includes("Unregistered component document"),
        ),
    );
});

test("a PR has exactly one branch-named changelog set in all supported languages", () => {
    const paths = languages.map(
        (language) => `src/docs/changelog/feature-example.${language}.md`,
    );
    assert.deepEqual(validateChangelogChanges(paths, "feature-example"), []);
    assert.ok(
        validateChangelogChanges(paths, "feature-example", {
            removed: ["src/docs/changelog/prior-release.en.md"],
        }).some((issue) =>
            issue.includes("Do not delete existing changelog records"),
        ),
    );
    for (const invalid of [
        paths.slice(1),
        [...paths, "src/docs/changelog/fix-another.en.md"],
        [
            ...paths,
            "src/adapters/example/provider/docs/changelog/feature-example.en.md",
        ],
        paths.map((path) =>
            path.replace("feature-example", "different-branch"),
        ),
    ])
        assert.ok(validateChangelogChanges(invalid, "feature-example").length);
});

test("core topics require directory entry bundles rather than arbitrary flat filenames", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-core-doc-contract-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(resolve(root, "example"));
    for (const [kind, name] of Object.entries({
        readme: "index",
        usage: "usage",
        technical: "technical",
    }))
        for (const language of languages)
            writeFileSync(
                resolve(root, "example", `${name}.${language}.md`),
                markdown(kind, language),
            );
    assert.deepEqual(validateCoreDocumentation(root), []);
    writeFileSync(resolve(root, "example.en.md"), markdown("readme"));
    assert.ok(
        validateCoreDocumentation(root).some((issue) =>
            issue.includes("directory entry bundle"),
        ),
    );
    rmSync(resolve(root, "example.en.md"));
    rmSync(resolve(root, "example", "technical.ja.md"));
    assert.ok(
        validateCoreDocumentation(root).some((issue) =>
            issue.includes("technical.ja.md"),
        ),
    );
});

test("technical paragraphs have one authoritative owner", () => {
    const paths = sourceFiles(resolve(ROOT, "src")).filter((path) =>
        /\/(?:TECHNICAL(?:\.(?:de|id|ja))?|technical\.(?:en|de|id|ja))\.md$/.test(
            path,
        ),
    );
    assert.deepEqual(duplicateTechnicalParagraphs(paths), []);
});

test("documentation templates match the role contract and must be filled before shipping", () => {
    for (const kind of Object.keys(documents))
        for (const language of languages) {
            const template = readFileSync(
                resolve(
                    ROOT,
                    ".github/documentation",
                    `${documents[kind]}.${language}.md`,
                ),
                "utf8",
            );
            assert.deepEqual(
                [...template.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
                structure[language][kind],
            );
            assert.ok(
                validateMarkdown(template, kind, language).includes(
                    "Unfilled documentation template",
                ),
            );
        }
});

test("code examples may contain headings and shorter fences inside an outer Markdown fence", () => {
    const example =
        markdown("technical") +
        "\n````md\n## Sample Heading\n```sh\ncommand --help\n```\n````\n";
    assert.deepEqual(validateMarkdown(example, "technical", "en"), []);
});
