import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
    validateMarkdown,
    languages,
    documents,
} from "../../reuse/documentation/validate.js";
import structure from "../../reuse/documentation/structure.json" with { type: "json" };
import { markdown } from "./fixtures/documents.js";

const root = resolve(import.meta.dirname, "../../../..");

for (const language of languages) {
    for (const kind of Object.keys(documents)) {
        test(`${language} ${kind} rejects missing, duplicated and reordered sections`, () => {
            const valid = markdown(kind, language);
            const sections = structure[language][kind];
            for (const heading of sections) {
                const block = `## ${heading}\n\nConcrete instructions and expected behavior.\n`;
                for (const invalid of [
                    valid.replace(block, ""),
                    valid + "\n" + block,
                ])
                    assert.ok(
                        validateMarkdown(invalid, kind, language).length,
                        invalid,
                    );
            }
            for (let index = 1; index < sections.length; index++) {
                const invalid = valid
                    .replace(`## ${sections[index - 1]}\n`, "## SWAP\n")
                    .replace(
                        `## ${sections[index]}\n`,
                        `## ${sections[index - 1]}\n`,
                    )
                    .replace("## SWAP\n", `## ${sections[index]}\n`);
                assert.ok(
                    validateMarkdown(invalid, kind, language).some((issue) =>
                        issue.startsWith("Required H2 order:"),
                    ),
                );
            }
        });

        test(`${language} ${kind} rejects content and heading layout bypasses`, () => {
            const valid = markdown(kind, language);
            for (const intro of [
                "<!-- Invisible introduction -->",
                "- A list is not an introductory paragraph.",
                "### Hidden Subsection",
                "```txt\nOnly code\n```",
                "    Only indented code",
            ])
                assert.ok(
                    validateMarkdown(
                        valid.replace(
                            "A useful introduction for the component.",
                            intro,
                        ),
                        kind,
                        language,
                    ).includes("Missing introductory paragraph"),
                );
            for (const invalid of [
                valid.replace(
                    "Concrete instructions and expected behavior.",
                    "<!-- Hidden section text -->",
                ),
                valid + "\n### Empty Subsection\n\n<!-- Nothing visible -->\n",
                valid + "\n#### Skipped Level\n\nDetails.\n",
                valid.replace("# Example", "# " + "x".repeat(31)),
                valid.replace("# Example", "#  "),
                valid.replace("# Example\n\n", "# Example\n"),
                valid.replace(
                    `## ${structure[language][kind][0]}`,
                    `  ## ${structure[language][kind][0]}`,
                ),
                valid + "\nHidden Heading\n==============\n",
                valid + "\n<h2>Unregistered Heading</h2>\n",
                valid + "\n<div><h2>Unregistered Heading</h2></div>\n",
                valid.replace(
                    "Concrete instructions and expected behavior.",
                    "~~~txt\n\n~~~",
                ),
                valid + "\n<!-- Unclosed comment\n",
                valid + "\n~~~js\ncontent\n~~~not-a-closing-fence\n",
            ])
                assert.ok(
                    validateMarkdown(invalid, kind, language).length,
                    invalid,
                );
        });
    }
}

test("Info rejects both code fence styles while technical examples remain opaque", () => {
    for (const language of languages) {
        for (const fence of ["```", "~~~"]) {
            const example = `\n${fence}md\n# Embedded Title\n## Embedded Section\n<!-- comment example -->\n${fence}\n`;
            assert.ok(
                validateMarkdown(
                    markdown("readme", language) + example,
                    "readme",
                    language,
                ).some((issue) =>
                    issue.startsWith("README is for non-technical"),
                ),
            );
            for (const kind of ["usage", "technical"])
                assert.deepEqual(
                    validateMarkdown(
                        markdown(kind, language) + example,
                        kind,
                        language,
                    ),
                    [],
                );
        }
        assert.deepEqual(
            validateMarkdown(
                markdown("technical", language) +
                    "\n<!-- ## Commented Heading -->\n",
                "technical",
                language,
            ),
            [],
        );
        assert.deepEqual(
            validateMarkdown(
                markdown("technical", language) +
                    "\nUse `<!--` and `<h2>` as literal syntax examples.\n",
                "technical",
                language,
            ),
            [],
        );
    }
});

test("every localized standard publishes the exact section matrix consumed by validation", () => {
    for (const language of languages) {
        const manual = readFileSync(
            resolve(root, `src/docs/standard/TECHNICAL.${language}.md`),
            "utf8",
        );
        const rows = [
            ...manual.matchAll(
                /^\|\s*(en|de|id|ja)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|$/gm,
            ),
        ];
        assert.equal(rows.length, languages.length, language);
        const published = Object.fromEntries(
            rows.map((row) => [
                row[1],
                Object.fromEntries(
                    Object.keys(documents).map((kind, index) => [
                        kind,
                        [...row[index + 2].matchAll(/`([^`]+)`/g)].map(
                            (match) => match[1],
                        ),
                    ]),
                ),
            ]),
        );
        assert.deepEqual(published, structure, language);
    }
});
