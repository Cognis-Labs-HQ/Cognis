import assert from "node:assert/strict";
import { startFixture } from "./browser.js";

/** Real browser pointer input and editor bounds shared by drag and touch regressions. */
export async function pointerInput(browser, touch, phase, point) {
    if (touch) {
        await browser.command("Input.dispatchTouchEvent", {
            type: {
                down: "touchStart",
                move: "touchMove",
                up: "touchEnd",
                cancel: "touchCancel",
            }[phase],
            touchPoints:
                phase === "up" || phase === "cancel"
                    ? []
                    : [{ ...point, id: 11, radiusX: 4, radiusY: 4 }],
        });
    } else {
        await browser.command("Input.dispatchMouseEvent", {
            type: {
                down: "mousePressed",
                move: "mouseMoved",
                up: "mouseReleased",
            }[phase],
            ...point,
            button: "left",
            buttons: phase === "up" ? 0 : 1,
            clickCount: 1,
        });
    }
}

export async function editorBounds(browser) {
    await settleEditor(browser);
    return browser.evaluate(`(() => {
        const cell = document.querySelector('.composer-cell');
        const shade = document.querySelector('.composer-shade');
        return { cell: cell.getBoundingClientRect().toJSON(), top: parseFloat(cell.style.top),
            shade: shade?.getBoundingClientRect().toJSON(), shadeTop: shade ? parseFloat(shade.style.top) : null,
            height: cell.parentElement.style.minHeight,
            scroll: [...document.querySelectorAll('*')].reduce((sum, element) => sum + element.scrollTop, 0) };
    })()`);
}

/** Mounts an editable grid with its panel minimized and its first widget visible. */
export async function startEditorFixture(
    context,
    mode,
    viewport,
    touch = true,
    serverOptions = {},
    query = "",
) {
    const { browser } = await startFixture(
        context,
        `?mode=${mode}${query}`,
        viewport,
        serverOptions,
    );
    if (touch) {
        await browser.command("Emulation.setDeviceMetricsOverride", {
            width: viewport[0],
            height: viewport[1],
            deviceScaleFactor: 1,
            mobile: true,
        });
        await browser.command("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 2,
        });
    }
    await browser.evaluate(
        `document.querySelector('#composer-edit-toggle').click()`,
    );
    await browser.waitFor(`Boolean(document.querySelector('.composer-cell'))`);
    await browser.evaluate(
        `document.querySelector('.composer-panel-minimize-btn').click(); document.querySelector('.composer-cell').scrollIntoView({block: 'center', behavior: 'instant'})`,
    );
    await settleEditor(browser);
    return browser;
}

/** Activates an uncovered control through Chromium's native click input. */
export async function activateEditorControl(browser, selector) {
    const point = await revealEditorControl(browser, selector);
    await pointerInput(browser, false, "down", { x: point.x, y: point.y });
    await pointerInput(browser, false, "up", { x: point.x, y: point.y });
}

/** Moves the minimized floating panel aside with the same touchscreen gesture as widgets. */
export async function parkEditorPanel(browser) {
    const start = await browser.evaluate(`(() => {
        const toggle = document.querySelector('.composer-panel-minimize-btn');
        if (toggle.getAttribute('aria-expanded') === 'true') toggle.click();
        const bounds = document.querySelector('.composer-panel-header').getBoundingClientRect();
        return { x: bounds.left + 16, y: bounds.top + 16 };
    })()`);
    const end = await browser.evaluate(`({ x: 32, y: innerHeight - 110 })`);
    await pointerInput(browser, true, "down", start);
    await pointerInput(browser, true, "move", end);
    await pointerInput(browser, true, "up", end);
}

/** Waits for geometry observers to settle after scrolling or changing editor mode. */
export async function settleEditor(browser) {
    await browser.evaluate(
        `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    );
}

/** Scrolls a control clear of fixed page chrome without hiding or bypassing that chrome. */
export async function revealEditorControl(browser, selector, minimumY = 0) {
    const point = await browser.callFunction(
        `async function(selector, minimumY) {
        const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        document.querySelector(selector).scrollIntoView({block: 'center', behavior: 'instant'});
        await settle();
        let point;
        for (let attempt = 0; attempt < 24; attempt++) {
            const control = document.querySelector(selector);
            const bounds = control.getBoundingClientRect();
            const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
            const hit = document.elementFromPoint(x,y);
            point = { x, y, width: bounds.width, height: bounds.height, hit: control.contains(hit), intercepted: hit?.outerHTML.slice(0,240) };
            if (point.hit && y >= minimumY) return point;
            let moved = false;
            for (let parent = control.parentElement; parent; parent = parent.parentElement) {
                if (parent !== document.scrollingElement && !/^(auto|scroll)$/.test(getComputedStyle(parent).overflowY)) continue;
                const previous = parent.scrollTop;
                parent.scrollTop += y >= minimumY ? 12 : -12;
                if (parent.scrollTop !== previous) { moved = true; break; }
            }
            if (!moved) break;
            await settle();
        }
        return point;
    }`,
        [selector, minimumY],
    );
    assert.ok(
        point.hit && point.y >= minimumY,
        `Control ${selector} is reachable: ${point.intercepted}`,
    );
    return point;
}
