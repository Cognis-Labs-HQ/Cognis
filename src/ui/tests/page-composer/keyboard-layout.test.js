import test from "node:test";
import assert from "node:assert/strict";
import { bindLayoutKeyboard } from "../../reuse/page-composer/keyboard-layout.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";

function setup(testContext, maximum) {
    const previousCss = globalThis.CSS;
    globalThis.CSS = { escape: (value) => value };
    testContext.after(() => {
        globalThis.CSS = previousCss;
    });
    const cell = new EventTarget();
    const attributes = {};
    cell.setAttribute = (name, value) => {
        attributes[name] = value;
    };
    const placement = { id: "card", col: 0, row: 0, w: 2, h: 2 };
    let renders = 0;
    let focusCalls = 0;
    let allowed = true;
    let swap = null;
    const state = {
        gridCols: 6,
        gridRows: 6,
        gridSection: {
            querySelector: () => ({
                focus: () => {
                    focusCalls++;
                },
            }),
        },
    };
    bindLayoutKeyboard({
        cell,
        placement,
        state,
        gridSize: resolveElementGridSize({
            gridSize: { default: [2, 2], min: [2, 2], max: maximum },
        }),
        canPlace: () => allowed,
        findSwapCandidate: () => swap,
        render: () => {
            renders++;
        },
        i18n: { t: () => "Keyboard layout controls" },
    });
    const press = (key, options = {}) => {
        const event = new Event("keydown", { cancelable: true });
        Object.assign(event, { key, ...options });
        cell.dispatchEvent(event);
        return event;
    };
    return {
        cell,
        placement,
        state,
        attributes,
        press,
        renders: () => renders,
        focusCalls: () => focusCalls,
        setAllowed: (value) => {
            allowed = value;
        },
        setSwap: (value) => {
            swap = value;
        },
    };
}

test("keyboard movement and resizing remain focusable after rendering", (context) => {
    const fixture = setup(context);
    assert.equal(fixture.cell.tabIndex, 0);
    fixture.press("ArrowRight");
    assert.equal(fixture.placement.col, 1);
    fixture.press("ArrowDown", { shiftKey: true });
    assert.equal(fixture.placement.h, 3);
    assert.equal(fixture.renders(), 2);
    assert.equal(fixture.focusCalls(), 2);
});

test("keyboard movement rejects collisions and supports swaps", (context) => {
    const fixture = setup(context);
    fixture.setAllowed(false);
    fixture.press("ArrowRight");
    assert.equal(fixture.renders(), 0);
    const other = { id: "other", col: 2, row: 0, w: 2, h: 2 };
    fixture.setSwap(other);
    fixture.press("ArrowRight");
    assert.equal(fixture.placement.col, 2);
    assert.equal(other.col, 0);
});

test("keyboard resize honors bounds and browser shortcut modifiers", (context) => {
    const fixture = setup(context, "full");
    fixture.press("ArrowRight", { shiftKey: true });
    fixture.press("ArrowRight", { ctrlKey: true });
    fixture.press("ArrowUp");
    assert.equal(fixture.renders(), 0);
    fixture.press("ArrowDown", { shiftKey: true });
    assert.equal(fixture.placement.h, 3);
});
