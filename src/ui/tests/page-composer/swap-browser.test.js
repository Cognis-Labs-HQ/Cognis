import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { skip } from "./reuse/browser.js";
import {
    startEditorFixture,
    pointerInput,
    settleEditor,
    parkEditorPanel,
} from "./reuse/editor-pointer.js";

const cases = JSON.parse(
    await readFile(new URL("./fixtures/swaps.json", import.meta.url), "utf8"),
).filter((fixture) => fixture.browser);

for (const mode of ["grid", "nested"]) {
    for (const [touch, viewport] of [
        [false, [1440, 900]],
        [true, [1440, 900]],
        [true, [390, 844]],
    ]) {
        for (const fixture of cases) {
            test(
                `${mode} ${touch ? "touch" : "mouse"} ${viewport[0]}px ${fixture.name}`,
                { skip, timeout: 60000 },
                async (context) => {
                    const key =
                        mode === "nested"
                            ? "responsive-nested-grid"
                            : "responsive-grid";
                    const layout = {
                        placements: fixture.placements,
                        hidden: [],
                    };
                    const profiles = {
                        layoutsByGrid: Object.fromEntries(
                            Array.from({ length: 32 }, (_, index) => [
                                `cols-${index + 1}`,
                                layout,
                            ]),
                        ),
                    };
                    const browser = await startEditorFixture(
                        context,
                        mode,
                        viewport,
                        touch,
                        {
                            apiResponses: {
                                [`/api/v1/social/users/fixture/preferences/${key}`]:
                                    {
                                        data: {
                                            layoutJson:
                                                JSON.stringify(profiles),
                                        },
                                    },
                            },
                        },
                        `&scenario=${encodeURIComponent(fixture.name)}`,
                    );
                    if (viewport[0] < 900) await parkEditorPanel(browser);
                    const before = await cells(browser);
                    const source = before.find((cell) => cell.id === "source");
                    const target = before.find((cell) => cell.id === "target");
                    const start = {
                        x: source.left + source.width / 2,
                        y: source.top + 72,
                    };
                    const end = {
                        x: start.x + (target.left - source.left),
                        y: start.y,
                    };
                    const hit = await browser.callFunction(
                        `function(point) { return document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 300); }`,
                        [start],
                    );
                    await pointerInput(browser, touch, "down", start);
                    await pointerInput(browser, touch, "move", end);
                    await settleEditor(browser);
                    const hint = await browser.evaluate(`(() => {
                        const line = document.querySelector('.composer-dropzone-line');
                        const style = line && getComputedStyle(line);
                        const token = ${JSON.stringify(fixture.valid ? "--accent-2" : "--color-danger-outline-text")};
                        const color = document.createElement('span');
                        color.style.color = 'var(' + token + ')';
                        line?.append(color);
                        const expectedColor = getComputedStyle(color).color;
                        color.remove();
                        return { line: Boolean(line), blocked: line?.classList.contains('composer-dropzone-line--invalid'),
                            invalid: Boolean(document.querySelector('.composer-shade--invalid')),
                            gradient: style?.backgroundImage, expectedColor };
                    })()`);
                    assert.equal(
                        hint.line,
                        true,
                        `Both legal and blocked leapfrogs have a dropzone line: ${JSON.stringify({ before, start, end, hit, hint })}`,
                    );
                    assert.equal(hint.blocked, !fixture.valid);
                    assert.equal(hint.invalid, !fixture.valid);
                    assert.ok(
                        hint.gradient.includes(hint.expectedColor),
                        "The rendered line uses the theme's success or danger colour",
                    );
                    await pointerInput(browser, touch, "up", end);
                    await settleEditor(browser);
                    const after = await cells(browser);
                    if (!fixture.valid) {
                        assert.deepEqual(
                            after,
                            before,
                            "A blocked exchange changes neither tile",
                        );
                        return;
                    }
                    const moved = after.find((cell) => cell.id === "source");
                    const displaced = after.find(
                        (cell) => cell.id === "target",
                    );
                    assert.ok(
                        Math.abs(
                            moved.left -
                                (source.left < target.left
                                    ? target.right - source.width
                                    : target.left),
                        ) < 1,
                    );
                    assert.ok(
                        Math.abs(
                            displaced.left -
                                (source.left < target.left
                                    ? source.left
                                    : source.right - target.width),
                        ) < 1,
                    );
                    for (const cell of after) {
                        const original = before.find(
                            (entry) => entry.id === cell.id,
                        );
                        assert.ok(Math.abs(cell.width - original.width) < 1);
                        assert.ok(Math.abs(cell.height - original.height) < 1);
                        assert.ok(Math.abs(cell.top - original.top) < 1);
                    }
                    assert.ok(
                        moved.right <= displaced.left + 1 ||
                            displaced.right <= moved.left + 1,
                    );
                    assert.equal(
                        await browser.evaluate(
                            "Boolean(document.querySelector('.composer-dropzone-line'))",
                        ),
                        false,
                        "Release clears preview feedback",
                    );
                },
            );
        }
    }
}

async function cells(browser) {
    return browser.evaluate(
        `Array.from(document.querySelectorAll('.composer-cell'), cell=>({id:cell.dataset.composerElement,...cell.getBoundingClientRect().toJSON()}))`,
    );
}
