import test from "node:test";
import assert from "node:assert/strict";
import { placeCallout } from "../presentation.js";

test("placement follows a scrolled visual viewport and keeps long translated panels inside it", () => {
    const viewport = {
        width: 390,
        height: 400,
        offsetLeft: 60,
        offsetTop: 150,
    };
    const target = {
        left: 100,
        top: 350,
        right: 200,
        bottom: 390,
        width: 100,
        height: 40,
    };
    for (const placement of ["auto", "left", "right", "top", "bottom"]) {
        const panel = placeCallout(
            target,
            { width: 360, height: 220 },
            viewport,
            placement,
        );
        assert.ok(panel.left >= viewport.offsetLeft + 8);
        assert.ok(panel.left + 360 <= viewport.offsetLeft + viewport.width - 8);
        assert.ok(panel.top >= viewport.offsetTop + 8);
        assert.ok(panel.top + 220 <= viewport.offsetTop + viewport.height - 8);
    }
});

test("oversized visible targets use a bounded inset callout rather than an offscreen arrow", () => {
    const viewport = {
        offsetLeft: 60,
        offsetTop: 150,
        width: 390,
        height: 400,
    };
    const result = placeCallout(
        {
            left: 68,
            top: 158,
            right: 442,
            bottom: 542,
            width: 374,
            height: 384,
        },
        { width: 360, height: 220 },
        viewport,
    );
    assert.equal(result.side, "inside");
    assert.equal(result.top, 158);
    assert.ok(result.left >= 68 && result.left + 360 <= 442);
});

test("a tall target uses available side space before falling back inside", () => {
    const result = placeCallout(
        { left: 20, top: 8, right: 100, bottom: 492, width: 80, height: 484 },
        { width: 220, height: 180 },
        { offsetLeft: 0, offsetTop: 0, width: 800, height: 500 },
    );
    assert.equal(result.side, "right");
    assert.ok(result.left > 100);
});

test("dock callouts retain low anchors and avoid the actual floating controls", () => {
    for (const width of [390, 1179, 1565]) {
        const viewport = { offsetLeft: 0, offsetTop: 80, width, height: 654 };
        const menu = { left: 16, right: 380, top: 650, bottom: 722 };
        for (const top of [610, 666, 722]) {
            const target = {
                left: width - 58,
                right: width - 14,
                top,
                bottom: top + 44,
                width: 44,
                height: 44,
            };
            const result = placeCallout(
                target,
                { width: Math.min(360, width - 16), height: 180 },
                viewport,
                "auto",
                0,
                [menu],
            );
            assert.notEqual(result.side, "inside");
            assert.ok(result.top >= 88);
            assert.ok(result.top + 180 <= 726);
            assert.ok(
                result.left + Math.min(360, width - 16) <= menu.left ||
                    result.left >= menu.right ||
                    result.top + 180 <= menu.top ||
                    result.top >= menu.bottom,
            );
            if (result.side === "top") assert.ok(result.top + 180 <= top - 14);
        }
    }
});
