import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture(context, { read, scan } = {}) {
    let callback,
        now = 0,
        busy = false;
    const calls = { reads: 0, scans: 0, errors: [] };
    const controller = new AbortController();
    context.after(() => controller.abort());
    const document = { visibilityState: "visible" };
    const polling = loadTestModule(
        new URL("../../app/modules/polling.js", import.meta.url),
        {},
        {
            Date: { now: () => now },
            document,
            window: {
                setInterval(run, interval) {
                    assert.equal(interval, 15_000);
                    callback = run;
                    return 1;
                },
                clearInterval(id) {
                    assert.equal(id, 1);
                    callback = undefined;
                },
            },
        },
    );
    const start = polling.createModulesPagePolling({
        isRefreshPending: () => busy,
        loadKnownModules: async (signal) => {
            calls.reads++;
            return read?.(signal);
        },
        discoverSources: async (signal) => {
            calls.scans++;
            return scan?.(signal);
        },
        log: (...args) => calls.errors.push(args),
        translate: (key) => key,
    });
    start(controller.signal);
    return {
        calls,
        controller,
        document,
        busy: (value) => (busy = value),
        async tick(elapsed = 15_000) {
            now += elapsed;
            callback?.();
            await new Promise(setImmediate);
        },
        get stopped() {
            return callback === undefined;
        },
    };
}

test("idle traffic stays at one state poll; source discovery runs hourly", async (context) => {
    const state = fixture(context);
    await state.tick();
    assert.equal(state.calls.scans, 1);
    for (let poll = 0; poll < 239; poll++) await state.tick();
    assert.equal(state.calls.reads, 240);
    assert.equal(state.calls.scans, 1);
    await state.tick();
    assert.equal(state.calls.scans, 2);
    state.document.visibilityState = "hidden";
    await state.tick();
    assert.equal(state.calls.reads, 241);
    state.controller.abort();
    assert.equal(state.stopped, true);
    await state.tick();
    assert.equal(state.calls.reads, 241);
});

test("source changes trigger discovery without waiting for the hourly deadline", async (context) => {
    let sourceRevision = "initial";
    const state = fixture(context, { read: () => ({ sourceRevision }) });
    await state.tick();
    sourceRevision = "updated";
    await state.tick();
    assert.equal(state.calls.scans, 2);
    await state.tick();
    assert.equal(state.calls.scans, 2);
});

test("slow polls do not overlap and a cancelled read cannot launch discovery", async (context) => {
    let finish;
    const pending = new Promise((resolve) => {
        finish = resolve;
    });
    const state = fixture(context, { read: () => pending });
    await state.tick();
    await state.tick();
    assert.equal(state.calls.reads, 1);
    state.controller.abort();
    finish();
    await new Promise(setImmediate);
    assert.equal(state.calls.scans, 0);
});

test("failed source discovery retries after a bounded delay and busy pages do not poll", async (context) => {
    const state = fixture(context, {
        scan: () => {
            throw new Error("unavailable");
        },
    });
    await state.tick();
    assert.equal(state.calls.errors.length, 1);
    await state.tick();
    assert.equal(state.calls.scans, 1);
    await state.tick(45_000);
    assert.equal(state.calls.scans, 2);
    state.busy(true);
    const reads = state.calls.reads;
    await state.tick();
    assert.equal(state.calls.reads, reads);
});

test("marketplace state requests preserve validators, cancellation and failures", async () => {
    const calls = [];
    let response = new Response(
        JSON.stringify({ data: { sources: [], installed: [], cached: [] } }),
        {
            headers: { etag: '"state"', "content-type": "application/json" },
        },
    );
    const api = loadTestModule(
        new URL("../../app/modules/api.js", import.meta.url),
        {
            "../../reuse/ui-ctx.js": { uiCtx: {} },
            "../../reuse/api-client.js": {
                apiFetch: async (...args) => {
                    calls.push(args);
                    return response;
                },
            },
        },
    );
    const controller = new AbortController();
    const first = await api.loadMarketplaceState(undefined, {
        signal: controller.signal,
    });
    assert.equal(first.etag, '"state"');
    response = new Response(null, { status: 304 });
    assert.equal(
        await api.loadMarketplaceState(first.etag, {
            signal: controller.signal,
        }),
        null,
    );
    assert.equal(calls[1][0], "/api/v1/modules/marketplace-state");
    assert.equal(calls[1][1].headers["if-none-match"], '"state"');
    assert.equal(calls[1][1].signal, controller.signal);
    assert.equal(calls[1][1].cache, "no-store");
    response = new Response(
        JSON.stringify({ error: { code: "failed", message: "Failed" } }),
        { status: 503 },
    );
    await assert.rejects(api.loadMarketplaceState(first.etag), {
        code: "failed",
        status: 503,
    });
});
