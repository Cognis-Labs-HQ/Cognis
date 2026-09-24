import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/adapters/study/drawing/ui/provider.js"),
    "utf8",
);
const stylesheet = readFileSync(
    resolve("src/adapters/study/drawing/ui/drawing.css"),
    "utf8",
);

test("drawing practice uses the PiP capability and requires card stroke data", () => {
    assert.match(source, /study:drawing:open/);
    assert.match(source, /ui:makeFloatingWindow/);
    assert.match(source, /card\?\.id/);
    assert.match(source, /strokePattern\?\.strokes/);
});

test("drawing practice tracks ordered strokes and adaptive guidance", () => {
    assert.match(source, /scoreStroke/);
    assert.match(source, /resample/);
    assert.match(source, /rootMeanSquare/);
    assert.match(source, /guidanceLevel/);
    assert.match(source, /consecutiveMistakes/);
    assert.match(source, /completed\.length/);
    assert.match(source, /data-undo/);
    assert.match(source, /data-reset/);
    assert.match(source, /playSuccessSound/);
    assert.match(source, /createOscillator/);
    assert.match(source, /659\.25/);
    assert.match(source, /783\.99/);
    assert.match(source, /is-error/);
    assert.match(source, /is-success/);
    assert.match(stylesheet, /@keyframes drawing-error-shake/);
    assert.match(stylesheet, /@keyframes drawing-success-shake/);
    assert.match(stylesheet, /prefers-reduced-motion: reduce/);
});
