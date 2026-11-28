import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";
import { pointerInput } from "./reuse/editor-pointer.js";

for (const mode of ["grid", "nested"]) {
    for (const theme of ["light", "dark"]) {
        test(
            `${mode} resize controls respect neighbours in ${theme} theme`,
            { skip, timeout: 60000 },
            async (context) => {
                const { browser } = await startFixture(
                    context,
                    `?mode=${mode}&scenario=blocked`,
                    // Exercise shrinking above the declared minimum in the main grid;
                    // nested defaults remain at their minimum width.
                    mode === "grid" ? [1530, 900] : [1440, 900],
                );
                await browser.callFunction(
                    `function(theme) { document.body.dataset.theme = theme; }`,
                    [theme],
                );
                await browser.evaluate(
                    `document.querySelector('#composer-edit-toggle').click()`,
                );
                await browser.waitFor(
                    `Boolean(document.querySelector('.composer-cell'))`,
                );
                const controls = () =>
                    browser.evaluate(`(() => {
                const cell = document.querySelector('.composer-cell[data-composer-element="form"]');
                const cursor = suffix => { const handle = cell.querySelector('.composer-resize-' + suffix); return handle ? getComputedStyle(handle).cursor : null; };
                return { east: cursor('e'), south: cursor('s'), southeast: cursor('se') };
            })()`);
                assert.deepEqual(await controls(), {
                    east: mode === "grid" ? "w-resize" : null,
                    south: null,
                    southeast: null,
                });
                const button = await browser.evaluate(`(() => {
                const button = document.querySelector('.composer-close-btn');
                const expected = getComputedStyle(document.querySelector('.composer-discard-btn'));
                const actual = getComputedStyle(button);
                return { cancel: button.classList.contains('btn-cancel'), color: actual.color, expectedColor: expected.color, border: actual.borderTopColor, expectedBorder: expected.borderTopColor };
            })()`);
                assert.ok(
                    button.cancel,
                    "Remove uses the shared cancel control",
                );
                assert.equal(button.color, button.expectedColor);
                assert.equal(button.border, button.expectedBorder);
                await browser.command("Emulation.setTouchEmulationEnabled", {
                    enabled: true,
                    maxTouchPoints: 2,
                });
                await browser.waitFor(
                    `getComputedStyle(document.querySelector('.composer-close-btn')).opacity === '1'`,
                );
                assert.equal(
                    await browser.evaluate(
                        `getComputedStyle(document.querySelector('.composer-close-btn')).opacity`,
                    ),
                    "1",
                    "Cancel control stays visible on touch devices",
                );
                if (mode === "grid") {
                    const point = await browser.evaluate(
                        `(() => { const bounds = document.querySelector('.composer-cell[data-composer-element="form"] .composer-resize-e').getBoundingClientRect(); return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }; })()`,
                    );
                    await pointerInput(browser, false, "down", point);
                    const outward = { x: point.x + 100, y: point.y };
                    await pointerInput(browser, false, "move", outward);
                    assert.equal(
                        await browser.evaluate(
                            `getComputedStyle(document.querySelector('.composer-cell[data-composer-element="form"] .composer-resize-e')).cursor`,
                        ),
                        "not-allowed",
                        "Blocked expansion shows an unavailable cursor",
                    );
                    await pointerInput(browser, false, "up", outward);
                    assert.equal(
                        (await controls()).east,
                        "w-resize",
                        "Release restores the valid shrink direction",
                    );
                }
                for (const [id, expected] of [
                    [
                        "right",
                        {
                            east: mode === "grid" ? "ew-resize" : "e-resize",
                            south: null,
                            southeast: null,
                        },
                    ],
                    [
                        "below",
                        {
                            east: mode === "grid" ? "ew-resize" : "e-resize",
                            south: "s-resize",
                            southeast: mode === "grid" ? "sw-resize" : null,
                        },
                    ],
                    [
                        "corner",
                        {
                            east: mode === "grid" ? "ew-resize" : "e-resize",
                            south: "s-resize",
                            southeast: "se-resize",
                        },
                    ],
                ]) {
                    await browser.callFunction(
                        `function(id) { document.querySelector('.composer-cell[data-composer-element="' + id + '"] .composer-close-btn').click(); }`,
                        [id],
                    );
                    assert.deepEqual(
                        await controls(),
                        expected,
                        `Removing ${id} releases only valid resize directions`,
                    );
                }
            },
        );
    }
}
