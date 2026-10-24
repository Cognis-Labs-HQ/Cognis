import test from "node:test";
import assert from "node:assert/strict";
import { beginPageLoading } from "../page-entry.js";

function element() {
    return {
        dataset: {},
        style: {},
        attributes: {},
        children: [],
        append(...children) {
            this.children.push(...children);
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        getAttribute(name) {
            return this.attributes[name];
        },
        removeAttribute(name) {
            delete this.attributes[name];
        },
        getBoundingClientRect() {
            return { top: 180, left: 20, width: 960, height: 1200 };
        },
    };
}

test("full-window loading remains busy until all overlapping navigation tokens finish", () => {
    const previous = Object.fromEntries(
        [
            "document",
            "window",
            "requestAnimationFrame",
            "cancelAnimationFrame",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
        ].map((name) => [name, globalThis[name]]),
    );
    const body = element();
    const frames = new Map();
    let serial = 0;
    Object.assign(globalThis, {
        document: { body, createElement: element },
        window: { innerHeight: 800 },
        requestAnimationFrame(callback) {
            const id = ++serial;
            frames.set(id, callback);
            return id;
        },
        cancelAnimationFrame(id) {
            frames.delete(id);
        },
        setTimeout() {
            return ++serial;
        },
        clearTimeout() {},
        setInterval() {
            return ++serial;
        },
        clearInterval() {},
    });
    let finishContent;
    let finishDocument;
    let finishNext;
    try {
        finishContent = beginPageLoading();
        const overlay = body.children[0];
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
        assert.equal(overlay.style.top, undefined);
        assert.equal(overlay.style.height, undefined);

        finishDocument = beginPageLoading();
        finishDocument();
        assert.equal(body.attributes["aria-busy"], "true");
        finishNext = beginPageLoading();
        finishContent();
        finishContent();
        assert.equal(body.dataset.pageReady, "false");
        finishNext();
        assert.equal(body.dataset.pageReady, "true");
        assert.equal(body.attributes["aria-busy"], "false");
        assert.equal(frames.size, 0);
    } finally {
        finishContent?.();
        finishDocument?.();
        finishNext?.();
        Object.assign(globalThis, previous);
    }
});
