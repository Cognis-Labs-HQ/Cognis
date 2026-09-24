import test from "node:test";
import assert from "node:assert/strict";
import {
    mountHorizontalCarousels,
    renderHorizontalCarousel,
} from "../horizontal-carousel.js";

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

test("horizontal carousel mounting uses a body-level preview portal", () => {
    assert.match(mountHorizontalCarousels.toString(), /cloneNode\(true\)/);
    assert.match(mountHorizontalCarousels.toString(), /is-portal/);
    assert.match(mountHorizontalCarousels.toString(), /document\.body\.append/);
});
