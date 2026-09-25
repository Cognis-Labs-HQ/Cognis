import test from "node:test";
import assert from "node:assert/strict";
import {
    mountHorizontalCarousels,
    renderHorizontalCarousel,
} from "../horizontal-carousel.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesheet = readFileSync(
    resolve("src/ui/styles/reuse/horizontal-carousel.css"),
    "utf8",
);

test("horizontal carousels preserve ordered selections and an add affordance", () => {
    const html = renderHorizontalCarousel({
        id: "words",
        label: "Words",
        items: [
            { value: "flower", label: "花火", preview: "fireworks" },
            { value: "particle", label: "が" },
        ],
        selectedValues: ["particle", "flower"],
        addLabel: "Create word",
    });

    assert.match(html, /data-horizontal-carousel="words"/);
    assert.match(html, /data-carousel-value="flower"[\s\S]*?>2<\/small>/);
    assert.match(html, /data-carousel-add/);
    assert.match(html, /aria-label="Create word"/);
    assert.match(html, /horizontal-carousel-preview/);
    assert.match(html, /fireworks/);
    assert.doesNotMatch(html, /data-carousel-scroll/);
});

test("horizontal carousels support selection-only editors", () => {
    const html = renderHorizontalCarousel({
        id: "pronunciation",
        label: "Pronunciation",
        items: [{ value: "kana-a", label: "あ" }],
        allowAdd: false,
    });

    assert.match(html, /data-horizontal-carousel="pronunciation"/);
    assert.doesNotMatch(html, /data-carousel-add/);
});

test("horizontal carousel mounting uses a body-level preview portal", () => {
    assert.match(mountHorizontalCarousels.toString(), /createAnchoredPopup/);
    assert.match(mountHorizontalCarousels.toString(), /is-portal/);
    assert.match(mountHorizontalCarousels.toString(), /previewOverlay\.show/);
    assert.match(mountHorizontalCarousels.toString(), /relatedTarget/);
    assert.match(stylesheet, /inline-size:\s*max-content/);
    assert.match(stylesheet, /max-inline-size:/);
});
