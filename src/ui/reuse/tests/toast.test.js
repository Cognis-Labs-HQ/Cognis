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
            opacity: "",
            transform: "",
            removeProperty: (property) => {
                this.style[property] = "";
            },
            setProperty() {},
        };
        this.classes = new Set();
        this.classList = {
            add: (className) => this.classes.add(className),
            contains: (className) => this.classes.has(className),
            remove: (className) => this.classes.delete(className),
        };
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

    dispatch(type, event = {}) {
        this.listeners.get(type)?.(event);
    }

    querySelector(selector) {
        const className = selector.slice(1);
        return (
            this.children.find((child) => child.className === className) ?? null
        );
    }

    setAttribute() {}

    matches() {
        return false;
    }

    remove() {}

    setPointerCapture() {}

    get offsetWidth() {
        return 1;
    }
}

test("temporary toast hover and drag gestures control dismissal", async () => {
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
        let dismissedCount = 0;
        let expiredCount = 0;
        showToast("Saved", {
            duration: 2_500,
            onDismiss: () => {
                dismissedCount += 1;
            },
            onExpire: () => {
                expiredCount += 1;
            },
        });
        const toast = tray.children.at(-1);

        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);

        toast.dispatch("mouseenter");
        assert.equal(timers.size, 0);

        toast.dispatch("mouseleave");
        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);
        assert.equal(toast.querySelector(".toast-timebar").style.animation, "");

        toast.dispatch("pointerdown", {
            button: 0,
            clientX: 20,
            isPrimary: true,
            pointerId: 1,
            pointerType: "touch",
        });
        toast.dispatch("pointermove", {
            clientX: 84,
            pointerId: 1,
        });
        assert.equal(toast.classList.contains("toast--hiding"), false);
        toast.dispatch("pointermove", {
            clientX: 40,
            pointerId: 1,
        });
        toast.dispatch("pointerup", {
            pointerId: 1,
            pointerType: "touch",
        });
        assert.equal(toast.classList.contains("toast--hiding"), false);
        assert.equal(timers.size, 1);

        toast.dispatch("pointerdown", {
            button: 0,
            clientX: 20,
            isPrimary: true,
            pointerId: 2,
            pointerType: "touch",
        });
        toast.dispatch("pointermove", {
            clientX: 84,
            pointerId: 2,
        });
        toast.dispatch("pointerup", {
            pointerId: 2,
            pointerType: "touch",
        });
        assert.equal(toast.classList.contains("toast--hiding"), true);
        toast.dispatch("transitionend");
        assert.equal(dismissedCount, 1);
        assert.equal(expiredCount, 0);

        showToast("Auto refresh", {
            duration: 2_500,
            onExpire: () => {
                expiredCount += 1;
            },
        });
        const expiringToast = tray.children.at(-1);
        const expirationTimer = [...timers.values()].find(
            ({ delay }) => delay === 2_500,
        );
        expirationTimer.callback();
        expiringToast.dispatch("transitionend");
        assert.equal(expiredCount, 1);

        showToast("Permanent", { permanent: true });
        const permanentToast = tray.children.at(-1);
        assert.equal(permanentToast.listeners.has("pointerdown"), false);
        assert.equal(
            permanentToast.classList.contains("toast--dismissible"),
            false,
        );
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
