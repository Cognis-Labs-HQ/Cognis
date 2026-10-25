import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture({ workerError = false } = {}) {
    const window = new EventTarget();
    let reloads = 0;
    let healthy = false;
    let now = 1_000;
    const timers = [];
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
            setTimeout: (callback) => {
                timers.push(callback);
                return timers.length;
            },
            fetch: async () => ({ ok: healthy }),
        },
    );
    return {
        window,
        advance: (milliseconds) => {
            now += milliseconds;
        },
        module,
        timers,
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
    assert.equal(typeof resume, "function");
    resume();
    assert.equal(state.reloads(), 1);
});

test("recovery reloads fresh server state when navigation is allowed", async () => {
    const state = fixture();
    state.module.setOffline(true);
    state.recover();
    await state.timers.shift()();
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
    assert.equal(state.reloads(), 1);
});
