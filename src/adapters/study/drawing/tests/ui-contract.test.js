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
    assert.match(source, /study:drawing:load/);
    assert.match(source, /ui:makeFloatingWindow/);
    assert.match(source, /card\?\.id/);
    assert.match(source, /strokePattern\?\.strokes/);
});

test("drawing practice tracks ordered strokes and progressive guidance", () => {
    assert.match(source, /scoreStroke/);
    assert.match(source, /resample/);
    assert.match(source, /rootMeanSquare/);
    assert.match(source, /drawStrokeOrder/);
    assert.match(source, /fillText\(String\(index \+ 1\)/);
    assert.match(source, /successiveMistakes >= 10/);
    assert.match(source, /adapter\.study\.drawing\.loser/);
    assert.match(source, /difficultyByCardId/);
    assert.match(source, /attemptedCardIds/);
    assert.match(source, /data-guidance/);
    assert.match(source, /currentPattern\.groups/);
    assert.match(source, /mistakes <= 1/);
    assert.match(source, /currentPattern\.strokes\.slice/);
    assert.match(source, /requestAnimationFrame/);
    assert.match(source, /cancelAnimationFrame/);
    assert.match(source, /completed\.push\(expected\)/);
    assert.match(source, /header\.style\.width/);
    assert.match(source, /completed\.length/);
    assert.match(source, /data-reset/);
    assert.match(source, /data-definition/);
    assert.match(source, /data-pronunciations/);
    assert.match(source, /currentPattern\.columns/);
    assert.match(source, /--drawing-columns/);
    assert.match(source, /playSuccessSound/);
    assert.match(source, /createOscillator/);
    assert.match(source, /659\.25/);
    assert.match(source, /783\.99/);
    assert.match(source, /is-error/);
    assert.match(source, /is-success/);
    assert.match(source, /data-complete/);
    assert.match(source, /data-mistakes/);
    assert.match(source, /data-try-again/);
    assert.match(source, /data-complete-close/);
    assert.match(source, /completion\.hidden = false/);
    assert.match(source, /mistakes = 0/);
    assert.match(source, /is-opening/);
    assert.match(source, /drawing-pad-open/);
    assert.match(stylesheet, /\.study-drawing-complete/);
    assert.match(stylesheet, /aspect-ratio:\s*var\(--drawing-columns/);
    assert.match(stylesheet, /\.study-drawing-result/);
    assert.match(stylesheet, /\.study-drawing-complete\.is-failure/);
    assert.match(stylesheet, /@keyframes drawing-error-shake/);
    assert.match(stylesheet, /@keyframes drawing-success-shake/);
    assert.match(stylesheet, /@keyframes drawing-pad-open/);
    assert.match(stylesheet, /@keyframes drawing-pad-close/);
    assert.match(
        stylesheet,
        /\[data-close\][\s\S]*width:\s*auto[\s\S]*height:\s*auto/,
    );
    assert.match(stylesheet, /prefers-reduced-motion: reduce/);
});
