import test from "node:test";
import assert from "node:assert/strict";
import { skip } from "./reuse/browser.js";
import {
    editorBounds,
    pointerInput,
    startEditorFixture,
    activateEditorControl,
    parkEditorPanel,
    revealEditorControl,
} from "./reuse/editor-pointer.js";

for (const mode of ["grid", "nested"]) {
    for (const viewport of [
        [1440, 900],
        [390, 844],
        [568, 320],
    ]) {
        test(
            `${mode} editor keeps its grab point and scrolls while dragging at ${viewport.join("x")}`,
            { skip, timeout: 60000 },
            async (context) => {
                const touch = viewport[0] < 900;
                const browser = await startEditorFixture(
                    context,
                    mode,
                    viewport,
                    touch,
                );
                const minimized = await browser.evaluate(
                    `document.querySelector('.composer-panel').getBoundingClientRect().height`,
                );
                assert.ok(
                    minimized < 100,
                    "Minimized controls leave room to edit",
                );
                const before = await editorBounds(browser);
                const point = {
                    x:
                        before.cell.left +
                        Math.min(84, before.cell.width * 0.35),
                    y: Math.min(before.cell.bottom - 60, viewport[1] / 2),
                };
                const hit = await browser.callFunction(
                    `function(point) { return Boolean(document.elementFromPoint(point.x, point.y)?.closest('.composer-cell')); }`,
                    [point],
                );
                assert.ok(hit, "The off-center grab point is visible");
                await pointerInput(browser, touch, "down", point);
                await pointerInput(browser, touch, "move", {
                    x: point.x + 1,
                    y: point.y + 1,
                });
                const held = await editorBounds(browser);
                assert.ok(held.shade, "Holding retains a preview");
                assert.ok(
                    Math.abs(held.shade.top - before.cell.top) < 1,
                    "A tiny move preserves the grabbed row",
                );
                assert.ok(
                    Math.abs(held.shade.left - before.cell.left) < 1,
                    "A tiny move preserves the grabbed column",
                );
                const edge = { x: point.x, y: viewport[1] - 58 };
                await pointerInput(browser, touch, "move", edge);
                await browser.waitFor(`(() => {
                const shade = document.querySelector('.composer-shade');
                const scroll = [...document.querySelectorAll('*')].reduce((sum, element) => sum + element.scrollTop, 0);
                return shade && scroll > ${before.scroll + 25};
            })()`);
                const scrolled = await editorBounds(browser);
                assert.ok(
                    scrolled.shadeTop > before.top,
                    "The held pointer reaches rows beyond the visible area",
                );
                if (touch) {
                    await pointerInput(browser, true, "cancel", edge);
                    await browser.waitFor(
                        `!document.querySelector('.composer-shade')`,
                    );
                    const cancelled = await editorBounds(browser);
                    assert.equal(
                        cancelled.top,
                        before.top,
                        "Touch cancellation preserves the placement",
                    );
                    assert.equal(
                        cancelled.height,
                        before.height,
                        "Touch cancellation restores provisional grid growth",
                    );
                    const resize = await revealEditorControl(
                        browser,
                        ".composer-resize-se",
                        100,
                    );
                    assert.ok(
                        resize.hit,
                        "The resize target is clear of floating controls",
                    );
                    assert.ok(
                        resize.width >= 44 && resize.height >= 44,
                        "Touch resize handle has a usable target",
                    );
                    const original = await editorBounds(browser);
                    await pointerInput(browser, true, "down", {
                        x: resize.x,
                        y: resize.y,
                    });
                    await pointerInput(browser, true, "move", {
                        x: resize.x,
                        y: resize.y - 98,
                    });
                    const resized = await editorBounds(browser);
                    assert.ok(
                        resized.shade.height < original.cell.height,
                        "Touch drag resizes the widget",
                    );
                    await pointerInput(browser, true, "up", {
                        x: resize.x,
                        y: resize.y - 98,
                    });
                    await browser.waitFor(
                        `!document.querySelector('.composer-shade')`,
                    );
                    assert.ok(
                        (await editorBounds(browser)).cell.height <
                            original.cell.height,
                        "Touch release applies the pending size",
                    );
                    await browser.evaluate(
                        `document.querySelector('.composer-panel-minimize-btn').click(); document.querySelector('.composer-discard-btn').click()`,
                    );
                    await browser.evaluate(
                        `document.querySelector('#composer-edit-toggle').click()`,
                    );
                    await browser.waitFor(
                        `Boolean(document.querySelector('.composer-cell'))`,
                    );
                    assert.equal(
                        (await editorBounds(browser)).cell.height,
                        before.cell.height,
                        "Discard restores the original size",
                    );
                } else {
                    await pointerInput(browser, false, "up", edge);
                    await browser.waitFor(
                        `!document.querySelector('.composer-shade')`,
                    );
                }
            },
        );
    }
}

for (const mode of ["grid", "nested"]) {
    test(
        `${mode} touch drag can move a widget past another and save the arrangement`,
        { skip, timeout: 60000 },
        async (context) => {
            const browser = await startEditorFixture(context, mode, [390, 844]);
            const bounds = await editorBounds(browser);
            const point = {
                x: bounds.cell.left + Math.min(84, bounds.cell.width * 0.35),
                y: 422,
            };
            await pointerInput(browser, true, "down", point);
            const edge = { x: point.x, y: 786 };
            await pointerInput(browser, true, "move", edge);
            await browser.waitFor(`(() => {
            const shade = document.querySelector('.composer-shade');
            const other = document.querySelector('.composer-cell[data-composer-element="content"]');
            return shade && !shade.classList.contains('composer-shade--invalid') && parseFloat(shade.style.top) >= parseFloat(other.style.top) + other.getBoundingClientRect().height;
        })()`);
            await pointerInput(browser, true, "up", edge);
            await browser.waitFor(`!document.querySelector('.composer-shade')`);
            const pendingTop = await browser.evaluate(
                `document.querySelector('.composer-cell[data-composer-element="form"]')?.style.top`,
            );
            assert.ok(
                parseFloat(pendingTop) > 0,
                `Touch release applies the pending move: ${pendingTop}`,
            );
            await browser.evaluate(`(() => {
            const toggle = document.querySelector('.composer-panel-minimize-btn');
            if (toggle.getAttribute('aria-expanded') === 'false') toggle.click();
            document.querySelector('.composer-done-btn').click();
        })()`);
            await browser.waitFor(
                `!document.querySelector('.composer-cell') && !document.querySelector('.composer-panel')`,
            );
            await browser.evaluate(
                `document.querySelector('#composer-edit-toggle').click()`,
            );
            await browser.waitFor(
                `Boolean(document.querySelector('.composer-cell'))`,
            );
            assert.ok(
                await browser.evaluate(
                    `parseFloat(document.querySelector('.composer-cell[data-composer-element="form"]').style.top) > 0`,
                ),
                `Done retains the reordered layout when editing resumes; pending top ${pendingTop}`,
            );
            await parkEditorPanel(browser);
            await activateEditorControl(
                browser,
                '.composer-cell[data-composer-element="form"] .composer-close-btn',
            );
            await browser.waitFor(
                `!document.querySelector('.composer-cell[data-composer-element="form"]')`,
            );
            await activateEditorControl(
                browser,
                '[data-composer-panel-item="form"] .composer-add-btn',
            );
            await browser.waitFor(
                `Boolean(document.querySelector('.composer-cell[data-composer-element="form"]'))`,
            );
            await browser.evaluate(
                `document.querySelector('#composer-edit-toggle').click()`,
            );
        },
    );
}

for (const mode of ["grid", "nested"]) {
    test(
        `${mode} keeps editing active while saving across a viewport change`,
        { skip, timeout: 60000 },
        async (context) => {
            let release;
            let started;
            const pending = new Promise((resolve) => {
                release = resolve;
            });
            const saving = new Promise((resolve) => {
                started = resolve;
            });
            context.after(() => release());
            const browser = await startEditorFixture(
                context,
                mode,
                [390, 844],
                true,
                {
                    async apiHandler(request) {
                        if (
                            request.method === "PUT" &&
                            request.url.includes("/preferences/responsive-")
                        ) {
                            started();
                            await pending;
                        }
                        return false;
                    },
                },
            );
            await browser.evaluate(
                `document.querySelector('.composer-panel-minimize-btn').click(); document.querySelector('.composer-done-btn').click()`,
            );
            await saving;
            await browser.resize(400, 844);
            assert.ok(
                await browser.evaluate(
                    `Boolean(document.querySelector('.composer-cell') && document.querySelector('.composer-panel'))`,
                ),
                "Pending save retains editor state through redraws",
            );
            release();
            await browser.waitFor(
                `!document.querySelector('.composer-cell') && !document.querySelector('.composer-panel')`,
            );
        },
    );

    test(
        `${mode} touch drag releases capture when its page unmounts`,
        { skip, timeout: 60000 },
        async (context) => {
            const browser = await startEditorFixture(context, mode, [390, 844]);
            const bounds = await editorBounds(browser);
            const point = {
                x: bounds.cell.left + Math.min(84, bounds.cell.width * 0.35),
                y: 422,
            };
            await pointerInput(browser, true, "down", point);
            await pointerInput(browser, true, "move", { ...point, y: 786 });
            assert.ok((await editorBounds(browser)).shade);
            await browser.evaluate(
                `window.fixture.lifetime.abort(); document.querySelector('#app').replaceChildren()`,
            );
            await browser.evaluate(
                `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
            );
            await pointerInput(browser, true, "up", point);
            assert.equal(
                browser.events.filter(
                    (event) => event.method === "Runtime.exceptionThrown",
                ).length,
                0,
                "Unmount cancels the pending drag without runtime errors",
            );
        },
    );
}
