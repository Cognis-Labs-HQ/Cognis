import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

class FakeElement {
    constructor() {
        this.children = [];
        this.listeners = new Map();
        this.style = {
            animation: "",
            removeProperty: (property) => {
                if (property === "animation") this.style.animation = "";
            },
            setProperty() {},
        };
        this.classList = { add() {}, remove() {} };
    }

    set innerHTML(value) {
        if (value.includes('class="toast-timebar"')) {
            const timebar = new FakeElement();
            timebar.className = "toast-timebar";
            this.children.push(timebar);
        }
    }

    appendChild(child) {
        this.children.push(child);
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    dispatch(type) {
        this.listeners.get(type)?.();
    }

    querySelector(selector) {
        const className = selector.slice(1);
        return this.children.find((child) => child.className === className) ?? null;
    }

    setAttribute() {}

    get offsetWidth() {
        return 1;
    }
}

test("toast hover restarts the full dismissal timeout when hover ends", async () => {
    const originalGlobals = {
        document: globalThis.document,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
    };
    const timers = new Map();
    let timerId = 0;
    const body = new FakeElement();
    const tray = new FakeElement();
    tray.className = "toast-tray";
    body.appendChild(tray);

    globalThis.document = {
        body,
        createElement: () => new FakeElement(),
        querySelector: (selector) =>
            selector === ".toast-tray" ? tray : { sheet: true },
    };
    globalThis.requestAnimationFrame = (callback) => callback();
    globalThis.setTimeout = (callback, delay) => {
        const id = ++timerId;
        timers.set(id, { callback, delay });
        return id;
    };
    globalThis.clearTimeout = (id) => timers.delete(id);

    try {
        const { showToast } = await import(`../toast.js?test=${Date.now()}`);
        showToast("Saved", { duration: 2_500 });
        const toast = tray.children.at(-1);

        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);

        toast.dispatch("mouseenter");
        assert.equal(timers.size, 0);

        toast.dispatch("mouseleave");
        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);
        assert.equal(toast.querySelector(".toast-timebar").style.animation, "");
    } finally {
        Object.assign(globalThis, originalGlobals);
    }
});

test("toast hover hides the dismissal timebar", () => {
    const stylesheet = readFileSync(
        fileURLToPath(new URL("../../styles/reuse/toast.css", import.meta.url)),
        "utf8",
    );

    assert.match(
        stylesheet,
        /\.toast:hover \.toast-timebar\s*{\s*display:\s*none;/,
    );
});
