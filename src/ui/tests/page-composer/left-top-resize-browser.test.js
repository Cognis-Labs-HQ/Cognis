import test from "node:test";
import assert from "node:assert/strict";
import { skip } from "./reuse/browser.js";
import {
    startEditorFixture,
    pointerInput,
    revealEditorControl,
    parkEditorPanel,
    settleEditor,
} from "./reuse/editor-pointer.js";

async function rectangle(browser) {
    return browser.evaluate(
        `document.querySelector('.composer-cell[data-composer-element="form"]').getBoundingClientRect().toJSON()`,
    );
}
for (const mode of ["grid", "nested"]) {
    for (const viewport of [
        [1440, 900],
        [390, 844],
    ]) {
        test(
            `${mode} left/top resizing anchors opposite edges at ${viewport.join("x")}`,
            { skip, timeout: 60000 },
            async (context) => {
                const touch = viewport[0] < 900;
                const browser = await startEditorFixture(
                    context,
                    mode,
                    viewport,
                    touch,
                );
                if (touch) await parkEditorPanel(browser);
                for (const [direction, delta] of [
                    ["w", { x: 80, y: 0 }],
                    ["n", { x: 0, y: 98 }],
                    ["nw", { x: -80, y: -98 }],
                ]) {
                    const control = await revealEditorControl(
                        browser,
                        `.composer-cell[data-composer-element="form"] .composer-resize-${direction}`,
                        direction === "nw" ? 100 : 0,
                    );
                    const before = await rectangle(browser);
                    const start = { x: control.x, y: control.y };
                    const end = { x: start.x + delta.x, y: start.y + delta.y };
                    await pointerInput(browser, touch, "down", start);
                    await pointerInput(browser, touch, "move", end);
                    const preview = await browser.evaluate(
                        `document.querySelector('.composer-shade')?.getBoundingClientRect().toJSON()`,
                    );
                    assert.ok(preview, "Resize preview is visible");
                    assert.ok(
                        Math.abs(preview.right - before.right) < 1,
                        `${direction} retains the right edge`,
                    );
                    assert.ok(
                        Math.abs(preview.bottom - before.bottom) < 1,
                        `${direction} retains the bottom edge`,
                    );
                    if (direction === "w")
                        assert.ok(preview.width < before.width);
                    if (direction === "n")
                        assert.ok(preview.height < before.height);
                    if (direction === "nw") {
                        assert.ok(preview.width > before.width);
                        assert.ok(preview.height > before.height);
                    }
                    await pointerInput(browser, touch, "up", end);
                    await browser.waitFor(
                        `!document.querySelector('.composer-shade')`,
                    );
                    await settleEditor(browser);
                    const after = await rectangle(browser);
                    assert.ok(Math.abs(after.width - preview.width) < 1);
                    assert.ok(Math.abs(after.height - preview.height) < 1);
                }
            },
        );
    }
}
