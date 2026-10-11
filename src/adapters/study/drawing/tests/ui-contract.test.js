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
const viewportSource = readFileSync(
    resolve("src/adapters/study/drawing/ui/viewport.js"),
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
    assert.match(source, /function distanceToSegment/);
    assert.match(source, /function annotationPosition/);
    assert.match(source, /occupiedAnnotations\.push\(label\)/);
    assert.match(source, /distance\(candidate, position\) - 21/);
    assert.match(source, /distanceToSegment\([\s\S]*?\)\s*-\s*12/);
    assert.match(
        source,
        /Math\.atan2\([\s\S]*\* viewport\.height,[\s\S]*\* viewport\.width/,
    );
    assert.match(source, /import \{ drawingViewport \}/);
    assert.match(
        viewportSource,
        /Math\.min\(canvas\.height, canvas\.width \/ aspect\)/,
    );
    assert.match(source, /viewport\.x \+ point\.x \* viewport\.width/);
    assert.match(source, /viewport\.y \+ point\.y \* viewport\.height/);
    assert.match(source, /fillText\(String\(index \+ 1\)/);
    assert.match(source, /successiveMistakes >= 10/);
    assert.match(source, /adapter\.study\.drawing\.loser/);
    assert.match(source, /difficultyByCardId/);
    assert.match(source, /hiddenGuideIndicesByCardId/);
    assert.match(source, /function addRandomHiddenGuide/);
    assert.match(source, /window\.crypto\.getRandomValues/);
    assert.match(source, /hiddenGuideIndices\.has\(index\)/);
    assert.match(source, /hiddenGuideIndices\.has\(completed\.length\)/);
    assert.match(source, /context\.fillText\("\?", 20, 22\)/);
    assert.match(source, /attemptedCardIds/);
    assert.match(source, /data-guidance/);
    assert.match(
        source,
        /hasAttemptedPiece = false;[\s\S]*revealHiddenGuides = true;[\s\S]*draw\(\);/,
    );
    assert.match(source, /currentPattern\.groups/);
    assert.match(source, /mistakes <= 1/);
    assert.match(source, /currentPattern\.strokes[\s\S]*?\.slice/);
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
    assert.match(
        source,
        /resize\(\);\s*window\.requestAnimationFrame\(resize\)/,
    );
    assert.match(source, /allowOrientationSwap:\s*false/);
    assert.match(
        source,
        /drawStrokeOrder\([\s\S]*visibleGuides\[0\]\.stroke,[\s\S]*visibleGuides\[0\]\.index,[\s\S]*occupiedAnnotations,[\s\S]*annotationPaths/,
    );
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
    assert.match(
        source,
        /window\.addEventListener\([\s\S]*"keydown"[\s\S]*event\.key !== "Escape"[\s\S]*close\(\)/,
    );
    assert.match(source, /completion\.hidden = false/);
    assert.match(source, /mistakes = 0/);
    assert.match(source, /is-opening/);
    assert.match(source, /drawing-pad-open/);
    assert.match(stylesheet, /\.study-drawing-complete/);
    assert.match(stylesheet, /aspect-ratio:\s*var\(--drawing-columns/);
    assert.match(
        stylesheet,
        /\.study-drawing-stage\s*\{[\s\S]*align-self:\s*start;[\s\S]*height:\s*auto;/,
    );
    assert.match(stylesheet, /max-width:\s*40vw/);
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
