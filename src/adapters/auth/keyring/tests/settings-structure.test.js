import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/settings.js", import.meta.url),
    "utf8",
);

test("keyring settings use canonical section structure", () => {
    assert.match(source, /components-section/);
    assert.match(source, /components-section-heading/);
    assert.match(source, /components-section-body/);
});

test("keyring event log pagination shows ten events per page", () => {
    assert.match(source, /const eventPageSize = 10;/);
});
