import assert from "node:assert/strict";
import test from "node:test";
import { createAdaptivePoller } from "../adaptive-poller.js";

function createFakeTimers() {
    let nextId = 1;
    const timers = new Map();
    return {
        setTimeout(callback, delay) {
            const id = nextId++;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
        nextDelay() {
            return timers.values().next().value?.delay;
        },
        async runNext() {
            const [id, timer] = timers.entries().next().value ?? [];
            if (!timer) return false;
            timers.delete(id);
            timer.callback();
            await Promise.resolve();
            await Promise.resolve();
            return true;
        },
        count() {
            return timers.size;
        },
    };
}

test("adaptive poller ramps up on activity and winds down independently", async () => {
    const timers = createFakeTimers();
    const results = [true, false, false];
    const poller = createAdaptivePoller({
        task: () => results.shift() ?? false,
        minIntervalMs: 100,
        maxIntervalMs: 1_000,
        initialIntervalMs: 1_000,
        windDownFactor: 2,
        setTimeoutFn: timers.setTimeout,
        clearTimeoutFn: timers.clearTimeout,
    });

    poller.start();
    assert.equal(timers.nextDelay(), 1_000);
    await timers.runNext();
    assert.equal(poller.getCurrentInterval(), 100);
    assert.equal(timers.nextDelay(), 100);
    await timers.runNext();
    assert.equal(poller.getCurrentInterval(), 200);
    assert.equal(timers.nextDelay(), 200);
    poller.markActivity();
    assert.equal(poller.getCurrentInterval(), 100);
    assert.equal(timers.nextDelay(), 100);
    poller.stop();
    assert.equal(timers.count(), 0);
});
