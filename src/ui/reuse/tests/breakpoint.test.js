import test from "node:test";
import assert from "node:assert/strict";
import {
    resolveBreakpointTier,
    getCurrentBreakpoint,
    watchBreakpoint,
} from "../breakpoint.js";

test("resolveBreakpointTier returns default when width exceeds all thresholds", () => {
    assert.equal(resolveBreakpointTier(1200, { sm: 480, md: 900 }), "default");
});

test("resolveBreakpointTier returns smallest matching tier", () => {
    assert.equal(resolveBreakpointTier(400, { sm: 480, md: 900 }), "sm");
});

test("resolveBreakpointTier matches exactly at boundary", () => {
    assert.equal(resolveBreakpointTier(480, { sm: 480, md: 900 }), "sm");
});

test("resolveBreakpointTier returns middle tier", () => {
    assert.equal(resolveBreakpointTier(700, { sm: 480, md: 900 }), "md");
});

test("resolveBreakpointTier resolves correctly regardless of key order", () => {
    assert.equal(
        resolveBreakpointTier(350, { lg: 1200, sm: 480, md: 900 }),
        "sm",
    );
});

test("resolveBreakpointTier returns default for empty breakpoints", () => {
    assert.equal(resolveBreakpointTier(300, {}), "default");
});

let documentWidth = 1024;
let resizeCallback = null;

globalThis.document = {
    documentElement: {
        getBoundingClientRect() {
            return { width: documentWidth };
        },
    },
};

globalThis.ResizeObserver = class {
    constructor(cb) {
        resizeCallback = cb;
    }
    observe() {}
    disconnect() {
        resizeCallback = null;
    }
};

function setWidth(w) {
    documentWidth = w;
    if (resizeCallback) resizeCallback([]);
}

test("getCurrentBreakpoint reads document width and resolves tier", () => {
    documentWidth = 400;
    assert.equal(getCurrentBreakpoint({ sm: 480, md: 900 }), "sm");

    documentWidth = 1200;
    assert.equal(getCurrentBreakpoint({ sm: 480, md: 900 }), "default");
});

test("watchBreakpoint fires callback when tier changes", () => {
    documentWidth = 1200;
    const changes = [];
    const watcher = watchBreakpoint({ sm: 480, md: 900 }, (tier) => {
        changes.push(tier);
    });

    setWidth(400);
    assert.deepEqual(changes, ["sm"]);

    setWidth(700);
    assert.deepEqual(changes, ["sm", "md"]);

    setWidth(1200);
    assert.deepEqual(changes, ["sm", "md", "default"]);

    watcher.dispose();
});

test("watchBreakpoint does not fire when tier is unchanged", () => {
    documentWidth = 1200;
    const changes = [];
    const watcher = watchBreakpoint({ sm: 480 }, (tier) => {
        changes.push(tier);
    });

    setWidth(1100);
    setWidth(950);
    assert.equal(changes.length, 0);

    watcher.dispose();
});

test("watchBreakpoint dispose stops observations", () => {
    documentWidth = 1200;
    const changes = [];
    const watcher = watchBreakpoint({ sm: 480 }, (tier) => {
        changes.push(tier);
    });

    watcher.dispose();
    setWidth(300);
    assert.equal(changes.length, 0);
});
