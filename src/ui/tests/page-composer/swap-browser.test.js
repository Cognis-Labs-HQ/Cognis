import test from "node:test";
import assert from "node:assert/strict";
import { skip } from "./reuse/browser.js";
import {
    startEditorFixture,
    pointerInput,
    settleEditor,
} from "./reuse/editor-pointer.js";

for (const mode of ["grid", "nested"]) {
    for (const [touch, viewport] of [
        [false, [1440, 900]],
        [true, [1440, 900]],
        [true, [390, 844]],
    ]) {
        for (const valid of [false, true]) {
            test(
                `${mode} ${touch ? "touch" : "mouse"} ${viewport[0]}px leap-frog ${valid ? "commits a valid swap" : "rejects a blocked destination"}`,
                { skip, timeout: 60000 },
                async (context) => {
                    const browser = await startEditorFixture(
                        context,
                        mode,
                        viewport,
                        touch,
                        {},
                        `&scenario=${valid ? "swap-valid" : "swap-conflict"}`,
                    );
                    const before = await cells(browser);
                    const source = before.find((cell) => cell.id === "source");
                    const target = before.find((cell) => cell.id === "target");
                    const start = {
                        x: source.left + 84,
                        y: source.top + source.height / 2,
                    };
                    const end = {
                        x: start.x + (target.left - source.left) / 2,
                        y: start.y + (target.top - source.top) / 2,
                    };
                    await pointerInput(browser, touch, "down", start);
                    await pointerInput(browser, touch, "move", end);
                    await settleEditor(browser);
                    const hint = await browser.evaluate(
                        `({invalid:Boolean(document.querySelector('.composer-shade--invalid')),swap:Boolean(document.querySelector('.composer-dropzone-line'))})`,
                    );
                    await pointerInput(browser, touch, "up", end);
                    await settleEditor(browser);
                    const after = await cells(browser);
                    assert.equal(
                        hint.swap,
                        valid,
                        "Only valid exchanges have a swap indicator",
                    );
                    assert.equal(
                        hint.invalid,
                        !valid,
                        "Blocked exchanges retain invalid feedback",
                    );
                    if (valid) {
                        for (const axis of ["left", "top"]) {
                            assert.ok(
                                Math.abs(
                                    after.find((cell) => cell.id === "source")[
                                        axis
                                    ] - target[axis],
                                ) < 1,
                            );
                            assert.ok(
                                Math.abs(
                                    after.find((cell) => cell.id === "target")[
                                        axis
                                    ] - source[axis],
                                ) < 1,
                            );
                        }
                    } else {
                        assert.deepEqual(
                            after,
                            before,
                            "Blocked exchanges leave all placements unchanged",
                        );
                    }
                    for (let left = 0; left < after.length; left++)
                        for (
                            let right = left + 1;
                            right < after.length;
                            right++
                        ) {
                            const leftEntry = after[left],
                                rightEntry = after[right];
                            assert.ok(
                                leftEntry.right <= rightEntry.left + 1 ||
                                    rightEntry.right <= leftEntry.left + 1 ||
                                    leftEntry.bottom <= rightEntry.top + 1 ||
                                    rightEntry.bottom <= leftEntry.top + 1,
                                "Committed cells do not overlap",
                            );
                        }
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
