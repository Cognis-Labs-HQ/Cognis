import test from "node:test";
import assert from "node:assert/strict";
import {
    skip,
    startFixture,
    assertHorizontallyContained,
} from "./reuse/browser.js";

const cases = [
    { viewport: [1440, 900], query: "" },
    { viewport: [920, 700], query: "scenario=fractional&document-scroll" },
    { viewport: [1024, 768], query: "scenario=fractional" },
    { viewport: [390, 844], query: "lang=de" },
    { viewport: [320, 568], query: "lang=ja" },
    { viewport: [568, 320], query: "lang=id" },
];

for (const { viewport, query } of cases) {
    test(
        `editor preview and panel fit ${viewport.join("x")} ${query}`,
        { skip, timeout: 60000 },
        async (context) => {
            const { browser } = await startFixture(
                context,
                `?${query}`,
                viewport,
            );
            await browser.evaluate(
                `document.querySelector('#composer-edit-toggle').click()`,
            );
            await browser.waitFor(
                `Boolean(document.querySelector('.composer-cell--editable'))`,
            );
            await browser.evaluate(
                `document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))`,
            );
            const panel = await browser.evaluate(`(() => {
            const panel = document.querySelector('.composer-panel');
            return { ...panel.getBoundingClientRect().toJSON(), actions: [...panel.querySelectorAll('.composer-panel-actions a')].map(action => {
                const range = document.createRange(); range.selectNodeContents(action);
                return { width: action.clientWidth, scrollWidth: action.scrollWidth, lines: range.getClientRects().length };
            }) };
        })()`);
            assertHorizontallyContained(panel, viewport[0], "Elements panel");
            for (const action of panel.actions) {
                assert.ok(
                    action.scrollWidth <= action.width + 1,
                    "Action text fits its button",
                );
                assert.equal(action.lines, 1, "Action labels stay on one line");
            }
            if (viewport[0] >= 900)
                assert.ok(
                    panel.width > 300,
                    "Desktop panel uses available width",
                );
            // Move the floating controls clear of the pointer target without changing grid layout.
            await browser.evaluate(
                `document.querySelector('.composer-panel').style.visibility = 'hidden'; document.querySelector('.composer-cell').scrollIntoView({block: 'center'})`,
            );
            const bounds = await browser.evaluate(`(() => {
            const cell = document.querySelector('.composer-cell');
            const card = document.querySelector('.widget-card[data-composer-element="' + cell.dataset.composerElement + '"]');
            return { cell: cell.getBoundingClientRect().toJSON(), card: card.getBoundingClientRect().toJSON() };
        })()`);
            for (const dimension of ["left", "top", "width", "height"])
                assert.ok(
                    Math.abs(bounds.card[dimension] - bounds.cell[dimension]) <
                        1,
                    `${dimension} matches the rendered card`,
                );
            const point = {
                x: bounds.cell.left + bounds.cell.width / 2,
                y: Math.min(bounds.cell.bottom - 20, viewport[1] / 2),
            };
            await browser.command("Input.dispatchMouseEvent", {
                type: "mousePressed",
                ...point,
                button: "left",
                buttons: 1,
                clickCount: 1,
            });
            const initialShade = await browser.evaluate(
                `document.querySelector('.composer-shade')?.getBoundingClientRect().toJSON()`,
            );
            assert.ok(initialShade, "Pressing the card displays a preview");
            for (const dimension of ["left", "top", "width", "height"])
                assert.ok(
                    Math.abs(bounds.card[dimension] - initialShade[dimension]) <
                        1,
                    `Initial preview ${dimension} matches the card`,
                );
            await browser.command("Input.dispatchMouseEvent", {
                type: "mouseMoved",
                x: point.x + 12,
                y: point.y + 30,
                button: "left",
                buttons: 1,
            });
            const shade = await browser.evaluate(
                `document.querySelector('.composer-shade')?.getBoundingClientRect().toJSON()`,
            );
            assert.ok(shade, "Dragging displays a preview");
            for (const dimension of ["width", "height"])
                assert.ok(
                    Math.abs(bounds.card[dimension] - shade[dimension]) < 1,
                    `Preview ${dimension} matches the rendered card`,
                );
            await browser.command("Input.dispatchMouseEvent", {
                type: "mouseReleased",
                ...point,
                button: "left",
                buttons: 0,
            });
        },
    );
}
