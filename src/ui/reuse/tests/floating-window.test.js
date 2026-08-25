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
        this.rect = rect ?? { left: 0, top: 0, width: 0, height: 0 };
        this.style = {};
        this.attributes = {};
        this.children = [];
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
        this.listeners.get(type)?.({ ...event, currentTarget: this });
    }

    append(...children) {
        for (const child of children) child.remove();
        this.children.push(...children);
        for (const child of children) child.parentElement = this;
    }

    insertBefore(child, sibling) {
        child.remove();
        const index = this.children.indexOf(sibling);
        this.children.splice(
            index < 0 ? this.children.length : index,
            0,
            child,
        );
        child.parentElement = this;
    }

    remove() {
        if (!this.parentElement) return;
        this.parentElement.children = this.parentElement.children.filter(
            (child) => child !== this,
        );
        this.parentElement = null;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
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
    const originalDocument = globalThis.document;
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
    const head = new FakeElement();
    const body = new FakeElement();
    globalThis.document = {
        head,
        body,
        querySelector: () => null,
        createElement: () => new FakeElement(),
        createElementNS: () => new FakeElement(),
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
        const originalParent = new FakeElement();
        originalParent.append(panel);
        const handle = new FakeElement(panel.rect);
        const release = makeFloatingWindow(panel, { handle });
        assert.equal(panel.parentElement, body);
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
        const toolbar = panel.children.find(
            (child) => child.className === "floating-window-toolbar",
        );
        const resizeHandle = panel.children.find(
            (child) => child.className === "floating-window-resize-handle",
        );
        assert.ok(toolbar);
        assert.ok(resizeHandle);
        assert.equal(resizeHandle.children[0]?.children.length, 1);

        toolbar.dispatch("pointerdown", {
            button: 0,
            pointerId: 4,
            clientX: 750,
            clientY: 500,
            target: { closest: () => null },
            preventDefault() {},
        });
        toolbar.dispatch("pointermove", {
            pointerId: 4,
            clientX: 500,
            clientY: 300,
        });
        assert.equal(panel.style.left, "450px");
        assert.equal(panel.style.top, "250px");

        panel.rect = { left: 450, top: 250, width: 280, height: 220 };
        resizeHandle.dispatch("pointerdown", {
            button: 0,
            pointerId: 5,
            clientX: 730,
            clientY: 470,
            preventDefault() {},
        });
        resizeHandle.dispatch("pointermove", {
            pointerId: 5,
            clientX: 850,
            clientY: 550,
            preventDefault() {},
        });
        assert.equal(panel.style.width, "400px");
        assert.equal(panel.style.height, "300px");

        const componentStage = new FakeElement({
            left: 100,
            top: 50,
            width: 600,
            height: 400,
        });
        panel.closest = (selector) =>
            selector === ".component-page-stage" ? componentStage : null;
        panel.rect = { left: 650, top: 400, width: 280, height: 220 };
        resizeCallback();
        assert.equal(panel.style.left, "320px");
        assert.equal(panel.style.top, "180px");

        panel.closest = () => null;
        panel.rect = { left: 900, top: 650, width: 1200, height: 800 };
        resizeCallback();
        assert.equal(panel.style.width, "1000px");
        assert.equal(panel.style.height, "700px");
        assert.equal(panel.style.left, "0px");
        assert.equal(panel.style.top, "0px");
        assert.equal(typeof windowListeners.get("resize"), "function");
        assert.match(
            floatingWindowStyles,
            /\.floating-window\s*{[\s\S]*?position: fixed;[\s\S]*?z-index: 1201;[\s\S]*?overflow: hidden;/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-toolbar\s*{[\s\S]*?height: 0\.8rem;[\s\S]*?cursor: move;/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-resize-handle svg\s*{[\s\S]*?stroke: currentColor;/,
        );

        release();
        assert.equal(resizeDisconnected, true);
        assert.equal(panel.classes.has("floating-window"), false);
        assert.equal(handle.classes.has("floating-window-handle"), false);
        assert.equal(panel.style.position, "");
        assert.equal(panel.style.width, "");
        assert.equal(panel.style.height, "");
        assert.equal(panel.style.zIndex, "");
        assert.equal(panel.children.includes(toolbar), false);
        assert.equal(panel.children.includes(resizeHandle), false);
        assert.equal(panel.parentElement, originalParent);
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
        globalThis.ResizeObserver = originalResizeObserver;
    }
});
