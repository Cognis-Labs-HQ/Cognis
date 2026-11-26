import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translationReferences } from "../../reuse/translations/references.js";

const cases = JSON.parse(
    readFileSync(
        new URL("./fixtures/references.json", import.meta.url),
        "utf8",
    ),
);
for (const [index, entry] of cases.entries()) {
    test(`translation reference scanner respects code and markup boundaries (${index + 1})`, () => {
        assert.deepEqual(
            translationReferences(entry.source, { html: entry.html }).map(
                ({ key }) => key,
            ),
            entry.keys,
        );
    });
}
