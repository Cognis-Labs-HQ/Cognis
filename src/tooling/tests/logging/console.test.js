import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consoleReferences } from "../../reuse/logging/console.js";

const cases = JSON.parse(
    readFileSync(new URL("./fixtures/cases.json", import.meta.url), "utf8"),
);
for (const source of cases.forbidden)
    test(`rejects native console access: ${source}`, () => {
        assert.ok(consoleReferences(source).length > 0);
    });
for (const source of cases.allowed)
    test(`accepts non-console diagnostics and inert examples: ${source}`, () => {
        assert.deepEqual(consoleReferences(source), []);
    });
