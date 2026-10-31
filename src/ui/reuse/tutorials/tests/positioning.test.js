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
