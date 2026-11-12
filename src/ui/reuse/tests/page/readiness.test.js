import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../../ui-ctx.js";
import {
    registerPageReadinessBlocker,
    installPageReadiness,
} from "../../page-readiness.js";

const tick = () => new Promise(setImmediate);

function fixture(context) {
    uiCtx.capabilities.get("ui:pageReadiness")?.dispose();
    const window = new EventTarget();
    window.location = { pathname: "/dashboard" };
    const readiness = installPageReadiness(uiCtx, { window });
    const registered = [];
    const extend = (stage, handler) => {
        const id = `test:${stage}`;
        uiCtx.extendFlow("page:ready", stage, { id }, handler);
        registered.push([stage, id]);
    };
    context.after(() => {
        readiness.dispose();
        for (const [stage, id] of registered)
            uiCtx.removeFlowHook("page:ready", stage, id);
    });
    return {
        window,
        readiness,
        extend,
        mounted: () =>
            uiCtx.runFlow("page:mounted", {
                pathname: window.location.pathname,
            }),
    };
}

test("page rendering completes while readiness waits for asynchronous checks and popup dismissal", async (context) => {
    const state = fixture(context);
    const loaded = Promise.withResolvers();
    const dismissed = Promise.withResolvers();
    let opened = false,
        readyConsumers = 0,
        blockers = 0;
    state.extend("blocking", async () => {
        blockers++;
        await loaded.promise;
        opened = true;
        await dismissed.promise;
    });
    state.extend("afterReady", () => readyConsumers++);
    assert.equal(state.readiness.isReady(), false);
    await state.mounted();
    assert.equal(blockers, 1);
    assert.equal(opened, false);
    assert.equal(state.readiness.isReady(), false);
    loaded.resolve();
    await tick();
    assert.equal(opened, true);
    assert.equal(state.readiness.isReady(), false);
    assert.equal(readyConsumers, 0);
    dismissed.resolve();
    await tick();
    assert.equal(state.readiness.isReady(), true);
    assert.equal(readyConsumers, 1);
    await state.mounted();
    assert.equal(blockers, 1);
});

test("navigation aborts old popup work and only the new page can become ready", async (context) => {
    const state = fixture(context);
    const requests = [];
    const published = [];
    state.extend(
        "blocking",
        ({ input }) =>
            new Promise((resolve) => {
                requests.push({ signal: input.signal, resolve });
            }),
    );
    state.extend("afterReady", ({ input }) => published.push(input.pathname));
    await state.mounted();
    state.window.dispatchEvent(new Event("cognis:route-will-change"));
    state.window.location.pathname = "/settings";
    await state.mounted();
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].signal.aborted, false);
    requests[0].resolve();
    await tick();
    assert.equal(state.readiness.isReady(), false);
    assert.deepEqual(published, []);
    requests[1].resolve();
    await tick();
    assert.equal(state.readiness.isReady(), true);
    assert.deepEqual(published, ["/settings"]);
});

test("disposing readiness aborts outstanding work and releases its hooks and capability", async (context) => {
    const state = fixture(context);
    let pending;
    state.extend(
        "blocking",
        ({ input }) =>
            new Promise((resolve) => {
                pending = { resolve, signal: input.signal };
            }),
    );
    await state.mounted();
    state.readiness.dispose();
    assert.equal(pending.signal.aborted, true);
    pending.resolve();
    await tick();
    assert.equal(uiCtx.capabilities.get("ui:pageReadiness"), undefined);
    await state.mounted();
    assert.equal(state.readiness.isReady(), false);
});

test("blocker replacement is lifetime safe and ordered before readiness consumers", async (context) => {
    const state = fixture(context);
    const oldLifetime = new AbortController();
    const latestLifetime = new AbortController();
    const calls = [];
    registerPageReadinessBlocker(
        uiCtx,
        { id: "test:replacement", signal: oldLifetime.signal },
        () => calls.push("old"),
    );
    const dispose = registerPageReadinessBlocker(
        uiCtx,
        { id: "test:replacement", signal: latestLifetime.signal },
        () => calls.push("latest"),
    );
    const setup = registerPageReadinessBlocker(
        uiCtx,
        { id: "test:setup", order: -100 },
        () => calls.push("setup"),
    );
    context.after(() => {
        dispose();
        setup();
    });
    oldLifetime.abort();
    state.extend("afterReady", () => calls.push("ready"));
    await state.mounted();
    await tick();
    assert.deepEqual(calls, ["setup", "latest", "ready"]);
});

test("a cancelled mount can remount the same URL with a fresh readiness cycle", async (context) => {
    const state = fixture(context);
    const first = new AbortController();
    const second = new AbortController();
    let cycles = 0;
    state.extend("blocking", () => cycles++);
    await uiCtx.runFlow("page:mounted", {
        pathname: state.window.location.pathname,
        signal: first.signal,
    });
    await tick();
    assert.equal(state.readiness.isReady(), true);
    first.abort();
    assert.equal(state.readiness.isReady(), false);
    await uiCtx.runFlow("page:mounted", {
        pathname: state.window.location.pathname,
        signal: second.signal,
    });
    await tick();
    assert.equal(state.readiness.isReady(), true);
    assert.equal(cycles, 2);
});

test("document history preserves a ready mount and its replay gate until page replacement", async (context) => {
    const state = fixture(context);
    state.window.location.pathname = "/docs/tutorials";
    let runs = 0;
    state.extend("blocking", () => runs++);
    await state.mounted();
    await tick();
    assert.equal(state.readiness.isReady(), true);
    for (const path of ["/docs/ui", "/docs/tutorials", "/docs/ui"]) {
        state.window.location.pathname = path;
        state.window.dispatchEvent(new Event("popstate"));
        await tick();
        assert.equal(state.readiness.isReady(), true);
    }
    assert.equal(runs, 1);
    state.window.dispatchEvent(new Event("cognis:route-will-change"));
    assert.equal(state.readiness.isReady(), false);
    state.window.location.pathname = "/changelogs/tutorials";
    await state.mounted();
    await tick();
    assert.equal(state.readiness.isReady(), true);
    state.window.location.pathname = "/changelogs/another";
    state.window.dispatchEvent(new Event("popstate"));
    await tick();
    assert.equal(state.readiness.isReady(), true);
    assert.equal(runs, 2);
});

test("direct and bundled registrations replace one owner through the shared capability", async (context) => {
    const state = fixture(context);
    const { registerPageReadinessBlocker: registerCopy } =
        await import("../../page-readiness.js?independent-loader");
    const previous = new AbortController();
    const replacement = new AbortController();
    context.after(() => replacement.abort());
    const calls = [];
    registerPageReadinessBlocker(
        uiCtx,
        { id: "test:sharedOwner", signal: previous.signal },
        () => calls.push("old"),
    );
    registerCopy(
        uiCtx,
        { id: "test:sharedOwner", signal: replacement.signal },
        () => calls.push("replacement"),
    );
    previous.abort();
    await state.mounted();
    await tick();
    assert.deepEqual(calls, ["replacement"]);
    assert.equal(state.readiness.isReady(), true);
});
