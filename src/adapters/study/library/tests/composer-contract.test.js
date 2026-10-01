import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/app/composer-contract.js", import.meta.url),
    "utf8",
);

test("vocabulary input falls back to an atomic character relationship", () => {
    assert.match(source, /target\?\.semanticRole !== "atomicWritingUnit"/);
    assert.match(source, /inputCarouselIds\.add\(characterRelationship\.id\)/);
});
