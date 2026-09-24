import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/adapters/study/drawing/ui/provider.js"),
    "utf8",
);

test("drawing practice uses the PiP capability and requires card stroke data", () => {
    assert.match(source, /study:drawing:open/);
    assert.match(source, /ui:makeFloatingWindow/);
    assert.match(source, /card\?\.id/);
    assert.match(source, /strokePattern\?\.strokes/);
});

test("drawing practice tracks ordered strokes and adjustable guidance", () => {
    assert.match(source, /scoreStroke/);
    assert.match(source, /completed\.length/);
    assert.match(source, /data-guidance/);
    assert.match(source, /data-undo/);
    assert.match(source, /data-reset/);
});
