import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture() {
    const window = new EventTarget();
    let reloads = 0;
    let healthy = false;
    const timers = [];
    window.location = { pathname: "/license", reload: () => reloads++ };
    const module = loadTestModule(
        new URL("../offline-state.js", import.meta.url),
        {},
        {
            window,
            navigator: { onLine: true },
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
