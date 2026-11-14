import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture({ workerError = false } = {}) {
    const window = new EventTarget();
    let reloads = 0;
    let healthy = false;
    let now = 1_000;
    const timers = [];
    const delays = [];
    let probes = 0;
    window.location = { pathname: "/license", reload: () => reloads++ };
    const module = loadTestModule(
        new URL("../offline-state.js", import.meta.url),
        {},
        {
            window,
            Date: { now: () => now },
            navigator: {
                onLine: true,
                ...(workerError
                    ? {
                          serviceWorker: {
                              controller: {
                                  postMessage(_message, ports) {
                                      queueMicrotask(() =>
                                          ports[0].peer.onmessage({
                                              data: {
                                                  error: "offline_catalog_unavailable",
                                              },
                                          }),
                                      );
                                  },
                              },
                          },
                      }
                    : {}),
            },
            MessageChannel: class {
                constructor() {
                    this.port1 = { close() {} };
                    this.port2 = { peer: this.port1, close() {} };
                }
            },
            clearTimeout: () => {},
            CustomEvent,
            AbortSignal,
            console,
            setTimeout: (callback, delay) => {
                delays.push(delay);
                timers.push(callback);
                return timers.length;
            },
            fetch: async () => {
                probes++;
                return { ok: healthy };
            },
        },
    );
    return {
        window,
        advance: (milliseconds) => {
            now += milliseconds;
        },
        module,
        timers,
        delays,
        probes: () => probes,
        recover: () => {
            healthy = true;
        },
        reloads: () => reloads,
    };
}

test("real server recovery and browser online events honor the navigation guard", async () => {
    const state = fixture();
    let resume;
    state.window.addEventListener("cognis:route-before-navigate", (event) => {
        event.preventDefault();
        resume = event.detail.resume;
    });
    state.module.setOffline(true);
    await state.timers.shift()();
    assert.equal(state.reloads(), 0);
    state.recover();
    state.window.dispatchEvent(new Event("online"));
    assert.equal(state.timers.length, 1);
    await state.timers.shift()();
    assert.equal(state.reloads(), 0);
    assert.equal(state.module.hasRecoveredConnection(), true);
    state.module.refreshAfterOffline();
    assert.equal(typeof resume, "function");
    resume();
    assert.equal(state.reloads(), 1);
});

test("recovery waits for the user to request a guarded refresh", async () => {
    const state = fixture();
    state.module.setOffline(true);
    state.recover();
    await state.timers.shift()();
    assert.equal(state.reloads(), 0);
    assert.equal(state.module.refreshAfterOffline(), true);
    assert.equal(state.reloads(), 1);
});

test("quiet error feedback is bounded to the connectivity transition", () => {
    const state = fixture();
    state.module.setOffline(true);
    assert.equal(state.module.isOfflineTransition(), true);
    state.advance(5_001);
    assert.equal(state.module.isOfflineTransition(), false);
    state.module.setOffline(true);
    assert.equal(state.module.isOfflineTransition(), true);
    state.module.setOffline(false);
    assert.equal(state.module.isOfflineTransition(), false);
});

test("worker maintenance errors cannot turn a reachable server back into offline mode", async () => {
    const state = fixture({ workerError: true });
    state.module.setOffline(true);
    state.recover();
    await state.timers.shift()();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(state.module.isOffline(), false);
    assert.equal(state.reloads(), 0);
});

test("offline probes run at most once every fifteen minutes even after repeated online events", async () => {
    const state = fixture();
    state.module.setOffline(true);
    for (let attempt = 0; attempt < 3; attempt++) {
        for (let online = 0; online < 5; online++)
            state.window.dispatchEvent(new Event("online"));
        assert.equal(state.timers.length, 1);
        assert.equal(state.delays.at(-1), 15 * 60_000);
        await state.timers.shift()();
        assert.equal(state.probes(), attempt + 1);
    }
    assert.equal(state.module.refreshAfterOffline(), false);
    assert.equal(state.reloads(), 0);
});

test("failed previous-page recovery arms automatic guarded refresh after server recovery", async () => {
    const state = fixture();
    let resume;
    state.window.addEventListener("cognis:route-before-navigate", (event) => {
        event.preventDefault();
        resume = event.detail.resume;
    });
    state.module.setOffline(true);
    state.module.enableOfflineAutoRefresh();
    state.recover();
    await state.timers.shift()();
    assert.equal(state.reloads(), 0);
    assert.equal(typeof resume, "function");
    resume();
    assert.equal(state.reloads(), 1);
});

test("manual recheck bypasses the fifteen-minute timer and coalesces checks before authorized recovery", async () => {
    const state = fixture();
    let recoveries = 0;
    state.window.addEventListener("cognis:connection-restoring", (event) => {
        event.detail.waitUntil(
            Promise.resolve().then(() => {
                recoveries++;
            }),
        );
    });
    state.module.setOffline(true);
    assert.equal(await state.module.recheckConnectivity(), false);
    assert.equal(state.module.isOffline(), true);
    assert.equal(recoveries, 0);
    state.recover();
    const results = await Promise.all([
        state.module.recheckConnectivity(),
        state.module.recheckConnectivity(),
    ]);
    assert.deepEqual(results, [true, true]);
    assert.equal(state.probes(), 2);
    assert.equal(recoveries, 1);
    assert.equal(state.module.isOffline(), false);
    assert.equal(state.reloads(), 0);
});
