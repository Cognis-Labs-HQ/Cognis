import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ambiguousNameIssues } from "../../reuse/ambiguous-names.js";

const cases = JSON.parse(
    readFileSync(new URL("./fixtures/cases.json", import.meta.url), "utf8"),
);
for (const fixture of cases) {
    test(`binding names: ${fixture.name}`, () => {
        assert.deepEqual(
            ambiguousNameIssues(fixture.source).map((issue) => issue.name),
            fixture.names,
        );
    });
}

test("naming diagnostics identify exact source positions", () => {
    const fixture = cases.find((entry) => entry.name === "multiline export");
    assert.deepEqual(ambiguousNameIssues(fixture.source), [
        { name: "el", line: 3, offset: 14, kind: "binding" },
    ]);
});

test("invalid source cannot silently pass naming inspection", () => {
    assert.throws(() => ambiguousNameIssues("const = ;"));
});
