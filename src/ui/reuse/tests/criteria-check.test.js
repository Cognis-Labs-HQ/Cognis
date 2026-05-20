import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = readFileSync(
    resolve(ROOT, "src/ui/reuse/criteria-check.js"),
    "utf8",
);

test("criteria-check exports attachCriteriaCheck", () => {
    assert.match(source, /export function attachCriteriaCheck/);
});

test("criteria-check attachCriteriaCheck returns isValid and detach", () => {
    assert.match(source, /return\s*\{\s*isValid,\s*detach\s*\}/);
});

test("criteria-check uses aria-live for accessibility", () => {
    assert.match(source, /aria-live/);
});

test("criteria-check uses genericMessage fallback when no criterion message given", () => {
    assert.match(source, /failing\.message\s*\?\?\s*genericMessage/);
});

test("criteria-check listens for input and blur events", () => {
    assert.match(source, /"input",\s*runAndUpdate/);
    assert.match(source, /"blur",\s*runAndUpdate/);
});

test("criteria-check detach removes event listeners and the indicator element", () => {
    assert.match(source, /field\.removeEventListener\("input"/);
    assert.match(source, /field\.removeEventListener\("blur"/);
    assert.match(source, /indicator\.remove\(\)/);
});
