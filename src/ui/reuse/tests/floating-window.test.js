import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { makeFloatingWindow } from "../floating-window.js";
import { uiCtx } from "../ui-ctx.js";

const floatingWindowStyles = readFileSync(
    new URL("../../styles/reuse/floating-window.css", import.meta.url),
    "utf8",
);

class FakeElement {
    constructor(rect) {
        this.rect = rect;
        this.style = {};
        this.listeners = new Map();
        this.classes = new Set();
        this.classList = {
            add: (name) => this.classes.add(name),
            remove: (name) => this.classes.delete(name),
        };
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type, event) {
        this.listeners.get(type)?.(event);
    }

    getBoundingClientRect() {
        return this.rect;
    }

    setPointerCapture(pointerId) {
        this.capturedPointer = pointerId;
    }
}

test("floating windows move, resize, remain visible, and release cleanly", () => {
    assert.equal(
        uiCtx.capabilities.get("ui:makeFloatingWindow"),
        makeFloatingWindow,
    );
    const originalWindow = globalThis.window;
    const originalResizeObserver = globalThis.ResizeObserver;
    const windowListeners = new Map();
    let resizeCallback;
    let resizeDisconnected = false;
    globalThis.window = {
        innerWidth: 1000,
        innerHeight: 700,
        addEventListener: (type, listener) =>
            windowListeners.set(type, listener),
    };
    globalThis.ResizeObserver = class {
        constructor(callback) {
            resizeCallback = callback;
        }
        observe() {}
        disconnect() {
            resizeDisconnected = true;
        }
    };
    try {
        const panel = new FakeElement({
            left: 700,
            top: 450,
            width: 280,
            height: 220,
        });
        const handle = new FakeElement(panel.rect);
        const release = makeFloatingWindow(panel, { handle });
        assert.equal(panel.classes.has("floating-window"), true);
        assert.equal(handle.classes.has("floating-window-handle"), true);
        assert.equal(panel.style.minWidth, "240px");
        assert.equal(panel.style.minHeight, "160px");
        assert.equal(panel.style.position, "fixed");
        assert.equal(panel.style.zIndex, "1201");
        assert.equal(panel.style.width, "min(32vw, 24rem)");
        assert.equal(panel.style.height, "min(32vh, 15rem)");
        assert.equal(panel.style.left, "700px");
        assert.equal(panel.style.top, "450px");

        handle.dispatch("pointerdown", {
            button: 0,
            pointerId: 4,
            clientX: 750,
            clientY: 500,
            target: { closest: () => null },
            preventDefault() {},
        });
        handle.dispatch("pointermove", {
            pointerId: 4,
            clientX: 500,
            clientY: 300,
        });
        assert.equal(panel.style.left, "450px");
        assert.equal(panel.style.top, "250px");

        panel.rect = { left: 900, top: 650, width: 1200, height: 800 };
        resizeCallback();
        assert.equal(panel.style.width, "1000px");
        assert.equal(panel.style.height, "700px");
        assert.equal(panel.style.left, "0px");
        assert.equal(panel.style.top, "0px");
        assert.equal(typeof windowListeners.get("resize"), "function");
        assert.match(
            floatingWindowStyles,
            /\.floating-window\s*{[\s\S]*?position: fixed;[\s\S]*?z-index: 1201;[\s\S]*?resize: both;/,
        );

        release();
        assert.equal(resizeDisconnected, true);
        assert.equal(panel.classes.has("floating-window"), false);
        assert.equal(handle.classes.has("floating-window-handle"), false);
        assert.equal(panel.style.position, "");
        assert.equal(panel.style.width, "");
        assert.equal(panel.style.height, "");
        assert.equal(panel.style.zIndex, "");
    } finally {
        globalThis.window = originalWindow;
        globalThis.ResizeObserver = originalResizeObserver;
    }
});
