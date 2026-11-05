import test from "node:test";
import assert from "node:assert/strict";
import {
    clipRect,
    shadeRegions,
    tutorialViewport,
    visibleTargetRect,
} from "../geometry.js";

const viewport = { offsetLeft: 60, offsetTop: 150, width: 390, height: 400 };

function target(bounds, parent) {
    return {
        getBoundingClientRect: () => bounds,
        parentElement: parent,
        ownerDocument: {
            defaultView: { getComputedStyle: (element) => element.style },
        },
    };
}

test("visible highlighting clips oversized areas to an offset visual viewport", () => {
    const element = target({
        left: -1000,
        top: -900,
        right: 3000,
        bottom: 4000,
    });
    assert.deepEqual(visibleTargetRect(element, viewport, 12), {
        left: 68,
        top: 158,
        right: 442,
        bottom: 542,
        width: 374,
        height: 384,
    });
});

test("scrolling ancestors clip highlights per axis without growing padding beyond the visible content", () => {
    const scroller = {
        style: { overflowX: "hidden", overflowY: "auto" },
        clientLeft: 2,
        clientTop: 2,
        clientWidth: 200,
        clientHeight: 240,
        getBoundingClientRect: () => ({
            left: 80,
            top: 200,
            right: 284,
            bottom: 444,
        }),
        parentElement: null,
    };
    const element = target(
        { left: 70, top: 100, right: 400, bottom: 1500 },
        scroller,
    );
    assert.deepEqual(visibleTargetRect(element, viewport, 10), {
        left: 82,
        top: 202,
        right: 282,
        bottom: 442,
        width: 200,
        height: 240,
    });
    scroller.style.overflowX = "visible";
    assert.equal(visibleTargetRect(element, viewport, 10).width, 342);
});

test("fully clipped and offscreen targets have no misleading highlight", () => {
    assert.equal(
        visibleTargetRect(
            target({ left: 0, top: 900, right: 200, bottom: 1000 }),
            viewport,
        ),
        null,
    );
    assert.equal(
        clipRect(
            { left: 10, top: 10, right: 20, bottom: 20 },
            { left: 20, top: 0, right: 30, bottom: 100 },
        ),
        null,
    );
});

test("page targets avoid shell chrome while header targets retain their own viewport", () => {
    const element = { contains: () => false };
    const header = {
        contains: (candidate) => candidate === header,
        getBoundingClientRect: () => ({
            left: 0,
            top: 4,
            right: 800,
            bottom: 140,
            width: 800,
            height: 136,
        }),
    };
    const footer = {
        contains: () => false,
        getBoundingClientRect: () => ({
            left: 0,
            top: 560,
            right: 800,
            bottom: 600,
            width: 800,
            height: 40,
        }),
    };
    const window = { innerWidth: 800, innerHeight: 600 };
    const document = {
        querySelector: (selector) =>
            selector === ".site-header" ? header : footer,
    };
    assert.deepEqual(tutorialViewport(window, document, element), {
        offsetLeft: 0,
        offsetTop: 140,
        width: 800,
        height: 420,
    });
    assert.deepEqual(tutorialViewport(window, document, header), {
        offsetLeft: 0,
        offsetTop: 0,
        width: 800,
        height: 560,
    });
});

test("shade excludes controls and targets even when their regions overlap or extend offscreen", () => {
    const bounds = { left: 0, top: 0, right: 120, bottom: 100 };
    for (const highlight of [
        { left: 10, top: 10, right: 110, bottom: 30 },
        { left: -20, top: -20, right: 140, bottom: 85 },
    ]) {
        const menu = { left: 35, top: 75, right: 85, bottom: 95 };
        const regions = shadeRegions(bounds, [highlight, menu]);
        for (let row = 0; row < 100; row++) {
            for (let column = 0; column < 120; column++) {
                const contains = (rect) =>
                    column >= rect.left &&
                    column < rect.right &&
                    row >= rect.top &&
                    row < rect.bottom;
                assert.equal(
                    regions.filter(contains).length,
                    contains(highlight) || contains(menu) ? 0 : 1,
                );
            }
        }
    }
});

test("broadcast notices reserve visible space for callouts while retaining header highlights", () => {
    const banner = {
        contains: () => false,
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            right: 800,
            bottom: 64,
            width: 800,
            height: 64,
        }),
    };
    const document = {
        querySelector: (selector) =>
            selector === "#site-top-banners" ? banner : null,
    };
    const window = { innerWidth: 800, innerHeight: 600 };
    const viewport = tutorialViewport(window, document, {
        contains: () => false,
    });
    assert.equal(viewport.offsetTop, 64);
    assert.equal(viewport.height, 536);
    assert.deepEqual(
        shadeRegions({ left: 0, top: 0, right: 800, bottom: 600 }, [
            banner.getBoundingClientRect(),
        ]),
        [{ left: 0, top: 64, right: 800, bottom: 600 }],
    );
});
