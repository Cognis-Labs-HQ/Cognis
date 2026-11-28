import test from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { setTimeout } from "node:timers/promises";
import { skip } from "./reuse/browser.js";
import {
    startEditorFixture,
    pointerInput,
    revealEditorControl,
    settleEditor,
    parkEditorPanel,
} from "./reuse/editor-pointer.js";

async function fixture(context, mode, viewport) {
    const key =
        mode === "nested" ? "responsive-nested-grid" : "responsive-grid";
    let saved = {
        layoutsByGrid: Object.fromEntries(
            Array.from({ length: 24 }, (_, index) => {
                const columns = index + 1;
                return [
                    `cols-${columns}`,
                    {
                        hidden: [],
                        placements: [
                            {
                                id: "form",
                                col: 0,
                                row: 2,
                                w: Math.min(3, columns),
                                h: 3,
                            },
                            {
                                id: "content",
                                col: columns >= 6 ? 4 : 0,
                                row: columns >= 6 ? 2 : 6,
                                w: Math.min(2, columns),
                                h: 3,
                            },
                        ],
                    },
                ];
            }),
        ),
    };
    const original = structuredClone(saved);
    const browser = await startEditorFixture(
        context,
        mode,
        viewport,
        viewport[0] < 900,
        {
            async apiHandler(request, response, url) {
                if (!url.pathname.endsWith(`/preferences/${key}`)) return false;
                if (request.method === "PUT") {
                    let body = "";
                    for await (const chunk of request) body += chunk;
                    saved = JSON.parse(body).layout;
                }
                response.end(
                    JSON.stringify({
                        data: { layoutJson: JSON.stringify(saved) },
                    }),
                );
                return true;
            },
        },
        "&scenario=feedback",
    );
    if (viewport[0] < 900) await parkEditorPanel(browser);
    return { browser, readSaved: () => saved, original };
}

async function settleGeometry(browser) {
    await settleEditor(browser);
    await browser.evaluate(
        `Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished))`,
    );
    await settleEditor(browser);
}

async function cellBounds(
    browser,
    selector = '.composer-cell[data-composer-element="form"]',
) {
    return browser.callFunction(
        `function(selector) { return document.querySelector(selector).getBoundingClientRect().toJSON(); }`,
        [selector],
    );
}

for (const mode of ["grid", "nested"]) {
    for (const viewport of [
        [1440, 900],
        [390, 844],
    ]) {
        test(
            `${mode} shows the yellow snapped destination and applies it before Done at ${viewport[0]}px`,
            { skip, timeout: 60000 },
            async (context) => {
                const { browser } = await fixture(context, mode, viewport);
                const control = await revealEditorControl(
                    browser,
                    '.composer-cell[data-composer-element="form"]',
                );
                const start = { x: control.x, y: control.y };
                const end = { x: start.x, y: start.y + 55 };
                const before = await cellBounds(browser);
                await pointerInput(browser, viewport[0] < 900, "down", start);
                await pointerInput(browser, viewport[0] < 900, "move", end);
                const preview = await browser.evaluate(`(() => {
                const shade = document.querySelector('.composer-shade');
                return { snapped: shade.classList.contains('composer-shade--snapped'), border: getComputedStyle(shade).borderTopColor, top: parseFloat(shade.style.top), bounds: shade.getBoundingClientRect().toJSON() };
            })()`);
                assert.equal(preview.snapped, true);
                assert.equal(preview.border, "rgb(234, 179, 8)");
                assert.equal(preview.top, 0);
                assert.equal(
                    (await cellBounds(browser)).height,
                    before.height,
                    "The card retains its geometry until release",
                );
                await pointerInput(browser, viewport[0] < 900, "up", end);
                await settleEditor(browser);
                assert.equal(
                    await browser.evaluate(
                        `parseFloat(document.querySelector('.composer-cell[data-composer-element="form"]').style.top)`,
                    ),
                    0,
                );
                const committed = await cellBounds(browser);
                for (const dimension of ["width", "height"])
                    assert.ok(
                        Math.abs(
                            committed[dimension] - preview.bounds[dimension],
                        ) < 1,
                    );
                assert.equal(
                    await browser.evaluate(
                        `Boolean(document.querySelector('.composer-grid-active'))`,
                    ),
                    true,
                    "The editor remains open",
                );
            },
        );

        test(
            `${mode} retains resized dimensions through Done and reload at ${viewport[0]}px`,
            { skip, timeout: 60000 },
            async (context) => {
                const { browser, readSaved, original } = await fixture(
                    context,
                    mode,
                    viewport,
                );
                const touch = viewport[0] < 900;
                const control = await revealEditorControl(
                    browser,
                    '.composer-cell[data-composer-element="form"] .composer-resize-e',
                );
                const start = { x: control.x, y: control.y };
                const end = { x: start.x - 100, y: start.y };
                const before = await cellBounds(browser);
                await pointerInput(browser, touch, "down", start);
                await pointerInput(browser, touch, "move", end);
                await pointerInput(browser, touch, "up", end);
                await settleGeometry(browser);
                const edited = await cellBounds(browser);
                assert.ok(
                    edited.width < before.width - 20,
                    "The gesture produces an explicit smaller width",
                );
                const positions = await browser.evaluate(
                    `Object.fromEntries([...document.querySelectorAll('.composer-cell')].map(cell => [cell.dataset.composerElement, { top: cell.getBoundingClientRect().top - cell.parentElement.getBoundingClientRect().top, width: cell.getBoundingClientRect().width, height: cell.getBoundingClientRect().height }]))`,
                );
                await browser.evaluate(
                    `document.querySelector('.composer-done-btn').click()`,
                );
                await browser.waitFor(
                    `!document.querySelector('.composer-cell')`,
                );
                await settleGeometry(browser);
                const savedPositions = readSaved();
                const changed = Object.entries(
                    savedPositions.layoutsByGrid,
                ).filter(
                    ([key, layout]) =>
                        !isDeepStrictEqual(layout, original.layoutsByGrid[key]),
                );
                assert.equal(
                    changed.length,
                    1,
                    "Only the edited grid profile changes",
                );
                const profile = changed[0][1];
                assert.ok(
                    profile,
                    "The explicit resized placement is persisted",
                );
                const rendered = await cellBounds(
                    browser,
                    '.widget-card[data-composer-element="form"]',
                );
                assert.ok(
                    Math.abs(rendered.width - edited.width) < 2,
                    `Saved width ${rendered.width} retains edited width ${edited.width}`,
                );
                assert.ok(Math.abs(rendered.height - edited.height) < 2);
                const peer = await cellBounds(
                    browser,
                    '.widget-card[data-composer-element="content"]',
                );
                assert.ok(
                    Math.abs(peer.width - positions.content.width) < 2,
                    "Done does not redistribute a neighboring card's width",
                );
                const relativePositions = await browser.evaluate(
                    `Object.fromEntries([...document.querySelectorAll('.widget-card[data-composer-element]')].map(card => [card.dataset.composerElement, card.getBoundingClientRect().top - card.parentElement.getBoundingClientRect().top]))`,
                );
                for (const id of ["form", "content"])
                    assert.ok(
                        Math.abs(relativePositions[id] - positions[id].top) < 2,
                        `Done retains the displayed row for ${id}`,
                    );
                const eventIndex = browser.events.length;
                await browser.command("Page.reload", { ignoreCache: true });
                const loaded = () =>
                    browser.events
                        .slice(eventIndex)
                        .some(
                            (event) => event.method === "Page.loadEventFired",
                        );
                for (let attempt = 0; attempt < 400 && !loaded(); attempt++)
                    await setTimeout(25);
                assert.ok(
                    loaded(),
                    "The replacement document has loaded before querying its execution context",
                );
                await browser.waitFor(`Boolean(window.fixture?.ready)`);
                await browser.evaluate(`document.fonts.ready`);
                await settleGeometry(browser);
                const reloaded = await cellBounds(
                    browser,
                    '.widget-card[data-composer-element="form"]',
                );
                assert.ok(Math.abs(reloaded.width - edited.width) < 2);
                assert.ok(Math.abs(reloaded.height - edited.height) < 2);
            },
        );
    }

    for (const [direction, axes] of [
        ["e", "horizontal"],
        ["s", "vertical"],
        ["se", "horizontal vertical"],
    ]) {
        for (const sign of [1, -1]) {
            test(
                `${mode} ${direction} ${sign > 0 ? "maximum" : "minimum"} resize feedback is orange`,
                { skip, timeout: 60000 },
                async (context) => {
                    const { browser } = await fixture(
                        context,
                        mode,
                        [1920, 1440],
                    );
                    const control = await revealEditorControl(
                        browser,
                        `.composer-cell[data-composer-element="form"] .composer-resize-${direction}`,
                    );
                    const start = { x: control.x, y: control.y };
                    const end = {
                        x: start.x + (direction.includes("e") ? sign * 400 : 0),
                        y: start.y + (direction.includes("s") ? sign * 400 : 0),
                    };
                    await pointerInput(browser, false, "down", start);
                    await pointerInput(browser, false, "move", end);
                    const feedback = await browser.evaluate(`(() => {
                    const shade = document.querySelector('.composer-shade');
                    return { color: getComputedStyle(shade).borderTopColor, axes: shade.dataset.resizeLimited };
                })()`);
                    assert.deepEqual(feedback, {
                        color: "rgb(249, 115, 22)",
                        axes,
                    });
                    await pointerInput(browser, false, "up", end);
                },
            );
        }
    }
}
