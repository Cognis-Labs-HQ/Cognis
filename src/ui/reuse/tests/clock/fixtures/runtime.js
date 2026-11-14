import assert from "node:assert/strict";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";

export function createClockRuntime() {
    const timers = new Map();
    const observers = new Set();
    const pagehideListeners = new Set();
    const preferences = new Map([
        ["cognis_timezone", "UTC"],
        ["cognis_time_format", "24h"],
    ]);
    let nextTimer = 0;
    const root = {
        nodes: new Map(),
        querySelector(selector) {
            return this.nodes.get(selector) ?? null;
        },
        contains(node) {
            return [...this.nodes.values()].includes(node);
        },
    };
    const globals = {
        document: root,
        localStorage: { getItem: (key) => preferences.get(key) ?? null },
        window: {
            addEventListener(name, listener) {
                assert.equal(name, "pagehide");
                pagehideListeners.add(listener);
            },
            removeEventListener(name, listener) {
                assert.equal(name, "pagehide");
                pagehideListeners.delete(listener);
            },
        },
        setInterval(callback, delay) {
            assert.equal(delay, 1000);
            timers.set(++nextTimer, callback);
            return nextTimer;
        },
        clearInterval(timer) {
            timers.delete(timer);
        },
        MutationObserver: class {
            constructor(callback) {
                this.callback = callback;
            }
            observe(target, options) {
                assert.equal(typeof target.querySelector, "function");
                assert.deepEqual(
                    { ...options },
                    { childList: true, subtree: true },
                );
                observers.add(this);
            }
            disconnect() {
                observers.delete(this);
            }
        },
    };
    const timestamp = loadTestModule(
        new URL("../../../timestamp.js", import.meta.url),
        {
            "./ui-preferences.js": {},
            "./offline-identity.js": {},
        },
        globals,
    );
    const clocks = loadTestModule(
        new URL("../../../clock-display.js", import.meta.url),
        { "./timestamp.js": timestamp },
        globals,
    );

    function insert(id) {
        const previous = root.nodes.get(`#${id}`);
        if (previous) previous.isConnected = false;
        const node = { isConnected: true, innerHTML: "", textContent: "" };
        root.nodes.set(`#${id}`, node);
        return node;
    }

    function remove(id) {
        const node = root.nodes.get(`#${id}`);
        if (node) node.isConnected = false;
        root.nodes.delete(`#${id}`);
    }

    return {
        ...clocks,
        root,
        timers,
        observers,
        pagehideListeners,
        preferences,
        insert,
        remove,
        flushMutations() {
            for (const observer of [...observers]) observer.callback();
        },
        tick() {
            for (const callback of [...timers.values()]) callback();
        },
        pagehide() {
            for (const listener of [...pagehideListeners]) listener();
        },
    };
}
