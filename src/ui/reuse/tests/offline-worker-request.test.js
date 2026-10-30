import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture() {
    const channels = [];
    const timers = new Map();
    let next = 0;
    let posted = 0;
    let fail = false;
    const worker = {
        postMessage() {
            posted++;
            if (fail) throw new Error("worker_stopped");
        },
    };
    class MessageChannel {
        constructor() {
            this.port1 = {
                close() {
                    this.closed = true;
                },
            };
            this.port2 = {
                close() {
                    this.closed = true;
                },
            };
            channels.push(this);
        }
    }
    const module = loadTestModule(
        new URL("../offline-state.js", import.meta.url),
        {},
        {
            navigator: { serviceWorker: { controller: worker } },
            MessageChannel,
            console,
            setTimeout: (fn) => {
                timers.set(++next, fn);
                return next;
            },
            clearTimeout: (id) => timers.delete(id),
        },
    );
    return {
        module,
        channels,
        timers,
        posted: () => posted,
        stop: () => {
            fail = true;
        },
    };
}

test("identical catalog requests share a worker exchange and release their ports", async () => {
    const state = fixture();
    const first = state.module.offlineWorkerRequest(
        "COGNIS_REFRESH_OFFLINE_ROUTES",
    );
    const second = state.module.offlineWorkerRequest(
        "COGNIS_REFRESH_OFFLINE_ROUTES",
    );
    assert.equal(state.posted(), 1);
    state.channels[0].port1.onmessage({ data: { result: ["route"] } });
    assert.deepEqual(await first, ["route"]);
    assert.deepEqual(await second, ["route"]);
    assert.equal(state.timers.size, 0);
    assert.equal(state.channels[0].port1.closed, true);
    assert.equal(state.channels[0].port2.closed, true);
});

test("stopped or unresponsive workers clean up channels and allow subsequent requests", async () => {
    const state = fixture();
    const pending = state.module.offlineWorkerRequest("COGNIS_OFFLINE_ROUTES");
    state.timers.values().next().value();
    await assert.rejects(pending, /offline_worker_timeout/);
    assert.equal(state.channels[0].port1.closed, true);
    assert.equal(state.channels[0].port2.closed, true);
    state.stop();
    await assert.rejects(
        state.module.offlineWorkerRequest("COGNIS_OFFLINE_ROUTES"),
        /worker_stopped/,
    );
    assert.equal(state.timers.size, 0);
});
