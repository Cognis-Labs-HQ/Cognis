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
        this.dataset = {};
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

    moveBefore(child, sibling) {
        this.statePreservingMoves = (this.statePreservingMoves ?? 0) + 1;
        this.insertBefore(child, sibling);
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

    hasAttribute(name) {
        return Object.hasOwn(this.attributes, name);
    }

    getAttribute(name) {
        return this.hasAttribute(name) ? this.attributes[name] : null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    showPopover() {
        this.popoverOpen = true;
    }

    hidePopover() {
        this.popoverOpen = false;
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
        let closeRequested = false;
        const release = makeFloatingWindow(panel, {
            handle,
            closeButton: {
                label: "Return",
                onClose: () => {
                    closeRequested = true;
                },
            },
        });
        assert.equal(panel.parentElement, body);
        assert.equal(body.statePreservingMoves, 1);
        assert.equal(panel.popoverOpen, true);
        assert.equal(panel.classes.has("floating-window"), true);
        assert.equal(handle.classes.has("floating-window-handle"), true);
        const closeButton = panel.children.find(
            (child) =>
                child.className ===
                "floating-window-close btn-close btn-neutral",
        );
        assert.equal(closeButton.attributes["aria-label"], "Return");
        assert.equal(panel.style.minWidth, "240px");
        assert.equal(panel.style.minHeight, "160px");
        assert.equal(panel.style.position, "fixed");
        assert.equal(panel.style.zIndex, "1201");
        assert.equal(panel.style.width, "min(32vw, 24rem)");
        assert.equal(panel.style.height, "min(32vh, 15rem)");
        assert.equal(panel.style.left, "700px");
        assert.equal(panel.style.top, "450px");
        assert.equal(
            release.updateMinimumSize({ width: 320, height: 240 }),
            true,
        );
        assert.equal(panel.style.minWidth, "320px");
        assert.equal(panel.style.minHeight, "240px");
        assert.equal(panel.style.width, "320px");
        assert.equal(panel.style.height, "240px");
        assert.equal(panel.style.left, "680px");
        assert.equal(panel.style.top, "450px");
        assert.equal(
            release.updateMinimumSize({ width: 0, height: 240 }),
            false,
        );
        assert.equal(panel.style.minWidth, "320px");
        const toolbar = panel.children.find(
            (child) => child.className === "floating-window-toolbar",
        );
        const topLeftResizeHandle = panel.children.find((child) =>
            child.className?.includes("resize-handle--top-left"),
        );
        const bottomRightResizeHandle = panel.children.find((child) =>
            child.className?.includes("resize-handle--bottom-right"),
        );
        assert.ok(toolbar);
        assert.ok(topLeftResizeHandle);
        assert.ok(bottomRightResizeHandle);
        assert.equal(topLeftResizeHandle.children[0]?.children.length, 1);
        assert.equal(bottomRightResizeHandle.children[0]?.children.length, 1);

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
        bottomRightResizeHandle.dispatch("pointerdown", {
            button: 0,
            pointerId: 5,
            clientX: 730,
            clientY: 470,
            preventDefault() {},
        });
        bottomRightResizeHandle.dispatch("pointermove", {
            pointerId: 5,
            clientX: 850,
            clientY: 550,
            preventDefault() {},
        });
        assert.equal(panel.style.width, "400px");
        assert.equal(panel.style.height, "300px");

        panel.rect = { left: 450, top: 250, width: 400, height: 300 };
        bottomRightResizeHandle.dispatch("pointerdown", {
            button: 0,
            pointerId: 7,
            clientX: 850,
            clientY: 550,
            preventDefault() {},
        });
        bottomRightResizeHandle.dispatch("pointermove", {
            pointerId: 7,
            clientX: 700,
            clientY: 650,
            preventDefault() {},
        });
        assert.equal(panel.style.minWidth, "240px");
        assert.equal(panel.style.minHeight, "320px");
        assert.equal(panel.style.width, "250px");
        assert.equal(panel.style.height, "400px");

        bottomRightResizeHandle.dispatch("pointermove", {
            pointerId: 7,
            clientX: 770,
            clientY: 490,
            preventDefault() {},
        });
        assert.equal(panel.style.minWidth, "240px");
        assert.equal(panel.style.minHeight, "320px");

        panel.rect = { left: 450, top: 250, width: 250, height: 400 };
        bottomRightResizeHandle.dispatch("pointerdown", {
            button: 0,
            pointerId: 8,
            clientX: 700,
            clientY: 650,
            preventDefault() {},
        });
        bottomRightResizeHandle.dispatch("pointermove", {
            pointerId: 8,
            clientX: 850,
            clientY: 500,
            preventDefault() {},
        });
        assert.equal(panel.style.minWidth, "320px");
        assert.equal(panel.style.minHeight, "240px");
        assert.equal(panel.style.width, "400px");
        assert.equal(panel.style.height, "250px");

        panel.rect = { left: 450, top: 250, width: 400, height: 300 };
        topLeftResizeHandle.dispatch("pointerdown", {
            button: 0,
            pointerId: 6,
            clientX: 450,
            clientY: 250,
            preventDefault() {},
        });
        topLeftResizeHandle.dispatch("pointermove", {
            pointerId: 6,
            clientX: 350,
            clientY: 200,
            preventDefault() {},
        });
        assert.equal(panel.style.left, "350px");
        assert.equal(panel.style.top, "200px");
        assert.equal(panel.style.width, "500px");
        assert.equal(panel.style.height, "350px");

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
        assert.match(
            floatingWindowStyles,
            /body\[data-theme="light"\] \.floating-window-resize-handle\s*{[\s\S]*?--floating-window-resize-color: #24344d;/,
        );
        assert.match(
            floatingWindowStyles,
            /body\[data-theme="dark"\] \.floating-window-resize-handle\s*{[\s\S]*?--floating-window-resize-color: #dbeafe;/,
        );
        assert.match(
            floatingWindowStyles,
            /prefers-color-scheme: dark[\s\S]*?body:not\(\[data-theme\]\) \.floating-window-resize-handle/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-resize-handle\s*{[\s\S]*?background: transparent;/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-resize-handle--top-left\s*{[\s\S]*?top: 0;[\s\S]*?left: 0;/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-resize-handle--bottom-right\s*{[\s\S]*?right: 0;[\s\S]*?bottom: 0;/,
        );
        assert.match(
            floatingWindowStyles,
            /\.floating-window-close\s*{[\s\S]*?top: 0\.35rem;[\s\S]*?right: 0\.35rem;/,
        );

        closeButton.dispatch("click", {});
        assert.equal(closeRequested, true);
        assert.equal(panel.classes.has("floating-window"), false);
        release();
        assert.equal(originalParent.statePreservingMoves, 1);
        assert.equal(
            release.updateMinimumSize({ width: 400, height: 300 }),
            false,
        );
        assert.equal(resizeDisconnected, true);
        assert.equal(panel.classes.has("floating-window"), false);
        assert.equal(handle.classes.has("floating-window-handle"), false);
        assert.equal(panel.style.position, "");
        assert.equal(panel.style.width, "");
        assert.equal(panel.style.height, "");
        assert.equal(panel.style.zIndex, "");
        assert.equal(panel.children.includes(toolbar), false);
        assert.equal(panel.children.includes(topLeftResizeHandle), false);
        assert.equal(panel.children.includes(bottomRightResizeHandle), false);
        assert.equal(panel.parentElement, originalParent);
        assert.equal(panel.popoverOpen, false);
        assert.equal(panel.hasAttribute("popover"), false);

        const componentPortalHost = new FakeElement();
        const componentPortalStage = new FakeElement();
        componentPortalStage.matches = (selector) =>
            selector === ".component-page-stage";
        componentPortalHost.append(componentPortalStage);
        componentPortalStage.append(panel);
        const releaseComponentPortal = makeFloatingWindow(panel, { handle });
        assert.equal(componentPortalStage.parentElement, body);
        assert.equal(panel.parentElement, componentPortalStage);
        releaseComponentPortal();
        assert.equal(componentPortalStage.parentElement, componentPortalHost);
        assert.equal(panel.parentElement, componentPortalStage);

        const componentStage = new FakeElement({
            left: 100,
            top: 50,
            width: 600,
            height: 400,
        });
        panel.closest = (selector) =>
            selector === ".component-page-stage" ? componentStage : null;
        panel.rect = { left: 650, top: 400, width: 280, height: 220 };
        const releaseFallback = makeFloatingWindow(panel, {
            handle,
            topLayer: false,
        });
        assert.equal(panel.popoverOpen, false);
        assert.equal(panel.style.left, "320px");
        assert.equal(panel.style.top, "180px");
        releaseFallback();

        const conflictPanel = new FakeElement({
            left: 400,
            top: 250,
            width: 320,
            height: 240,
        });
        const releaseConflictPanel = makeFloatingWindow(conflictPanel);
        const conflictResizeHandle = conflictPanel.children.find((child) =>
            child.className?.includes("resize-handle--bottom-right"),
        );
        conflictResizeHandle.closest = (selector) =>
            selector === ".floating-window-resize-handle"
                ? conflictResizeHandle
                : null;
        let propagationStopped = false;
        const resizePointerDown = {
            button: 0,
            pointerId: 12,
            clientX: 720,
            clientY: 490,
            target: conflictResizeHandle,
            preventDefault() {},
            stopPropagation() {
                propagationStopped = true;
            },
        };
        conflictResizeHandle.dispatch("pointerdown", resizePointerDown);
        conflictPanel.dispatch("pointerdown", resizePointerDown);
        assert.equal(propagationStopped, true);
        assert.equal(conflictPanel.capturedPointer, undefined);
        conflictResizeHandle.dispatch("pointermove", {
            pointerId: 12,
            clientX: 800,
            clientY: 550,
            preventDefault() {},
            stopPropagation() {},
        });
        assert.equal(conflictPanel.style.width, "400px");
        assert.equal(conflictPanel.style.height, "300px");
        windowListeners.get("pointerup")?.({ pointerId: 12 });
        conflictResizeHandle.dispatch("pointermove", {
            pointerId: 12,
            clientX: 900,
            clientY: 650,
            preventDefault() {},
            stopPropagation() {},
        });
        assert.equal(conflictPanel.style.width, "400px");
        assert.equal(conflictPanel.style.height, "300px");
        releaseConflictPanel();
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
        globalThis.ResizeObserver = originalResizeObserver;
    }
});
