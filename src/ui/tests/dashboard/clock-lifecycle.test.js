import assert from "node:assert/strict";
import test from "node:test";
import { loadDashboard } from "./fixtures/mount.js";
import { createClockRuntime } from "../../reuse/tests/clock/fixtures/runtime.js";

async function loadClockDashboard(options = {}) {
    const runtime = createClockRuntime();
    for (const kind of ["digital", "analogue"]) {
        runtime.insert(`dashboard-${kind}-clock-display`);
        runtime.insert(`dashboard-${kind}-clock-tz`);
    }
    const page = await loadDashboard({
        clockModule: runtime,
        onInit: (composer) => {
            for (const element of composer.options.elements)
                element.onRender?.();
        },
        ...options,
    });
    return { ...runtime, ...page };
}

test("dashboard remounts abort the old clock owner and retain one timer per display", async () => {
    const fixture = await loadClockDashboard();
    const first = new AbortController();
    await fixture.mount(fixture.root, { signal: first.signal });
    assert.equal(fixture.timers.size, 2);
    const previous = fixture.composers[0];
    for (let index = 0; index < 3; index++) {
        for (const element of previous.options.elements) element.onRender?.();
        assert.equal(fixture.timers.size, 2);
    }
    const second = new AbortController();
    await fixture.mount(fixture.root, { signal: second.signal });
    assert.equal(previous.options.signal.aborted, true);
    assert.equal(fixture.timers.size, 2);
    for (const element of previous.options.elements) element.onRender?.();
    first.abort();
    assert.equal(fixture.timers.size, 2);
    second.abort();
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.pagehideListeners.size, 0);
    assert.equal(fixture.observers.size, 0);
});

test("an interrupted dashboard localization cannot mount after its replacement", async () => {
    const ready = Promise.withResolvers();
    const fixture = await loadClockDashboard({ i18nReady: ready.promise });
    const oldMount = fixture.mount(fixture.root);
    const controller = new AbortController();
    const newMount = fixture.mount(fixture.root, { signal: controller.signal });
    ready.resolve();
    await Promise.all([oldMount, newMount]);
    assert.equal(fixture.composers.length, 1);
    assert.equal(fixture.timers.size, 2);
    controller.abort();
    assert.equal(fixture.timers.size, 0);
});

test("navigation during composer initialization releases clocks and ignores late hydration", async () => {
    const ready = Promise.withResolvers();
    const events = Promise.withResolvers();
    const extensions = Promise.withResolvers();
    const fixture = await loadClockDashboard({
        events: events.promise,
        extensions: extensions.promise,
        onInit: async (composer) => {
            for (const element of composer.options.elements)
                element.onRender?.();
            await ready.promise;
        },
    });
    const controller = new AbortController();
    const pendingMount = fixture.mount(fixture.root, {
        signal: controller.signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fixture.timers.size, 2);
    controller.abort();
    assert.equal(fixture.timers.size, 0);
    ready.resolve();
    events.resolve([]);
    extensions.resolve([{ id: "synthetic-extension" }]);
    await pendingMount;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fixture.composers[0].refreshed.length, 0);
    assert.equal(fixture.composers[0].refreshes, 0);
    assert.equal(fixture.observers.size, 0);
});

test("pagehide cleanup permits a fresh dashboard owner to restore live clocks", async () => {
    const fixture = await loadClockDashboard();
    const initial = new AbortController();
    await fixture.mount(fixture.root, { signal: initial.signal });
    const staleTicks = [...fixture.timers.values()];
    fixture.pagehide();
    initial.abort();
    assert.equal(fixture.timers.size, 0);
    const restored = new AbortController();
    await fixture.mount(fixture.root, { signal: restored.signal });
    for (const tick of staleTicks) tick();
    assert.equal(fixture.timers.size, 2);
    fixture.tick();
    restored.abort();
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.pagehideListeners.size, 0);
});
