import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../ui-ctx.js";
import { setOffline } from "../offline-state.js";

function fixture(context) {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    const originalStorage = globalThis.localStorage;
    const values = new Map([["cognis_offline_requirements", "[]"]]);
    globalThis.localStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    const window = new EventTarget();
    globalThis.window = window;
    setOffline(false);
    const scope = new AbortController();
    const requests = [];
    let serve = async () => new Response("public resource");
    globalThis.fetch = async (path, options) => {
        requests.push({ path, options });
        return serve(path, options);
    };
    context.after(() => {
        scope.abort();
        setOffline(false);
        globalThis.fetch = originalFetch;
        globalThis.window = originalWindow;
        globalThis.localStorage = originalStorage;
    });
    return {
        assets: uiCtx.capabilities.get("offline:assets"),
        signal: scope.signal,
        scope,
        requests,
        window,
        values,
        serve: (callback) => {
            serve = callback;
        },
    };
}

test("public asset preparation executes the registered flow, coalesces per owner and consumes bodies", async (context) => {
    const state = fixture(context);
    let consumed = 0;
    state.serve(async () => ({
        ok: true,
        headers: new Headers(),
        arrayBuffer: async () => {
            consumed++;
        },
    }));
    const paths = ["/static/template.html", "/static/icon.svg"];
    await Promise.all([
        state.assets.prepare(paths, { signal: state.signal }),
        state.assets.prepare(paths, { signal: state.signal }),
    ]);
    assert.equal(state.requests.length, 2);
    assert.equal(consumed, 2);
    assert.ok(
        state.requests.every(
            ({ options }) =>
                options.credentials === "omit" &&
                options.signal === state.signal,
        ),
    );
});

test("private/API assets are rejected and failed public reads can retry", async (context) => {
    const state = fixture(context);
    await assert.rejects(
        state.assets.prepare(["/api/v1/private"], { signal: state.signal }),
        /invalid_offline_asset/,
    );
    assert.equal(state.requests.length, 0);
    state.serve(
        async () =>
            new Response("private", {
                headers: { "cache-control": "private" },
            }),
    );
    await assert.rejects(
        state.assets.prepare(["/static/template.html"], {
            signal: state.signal,
        }),
        /offline_asset_unavailable/,
    );
    state.serve(async () => new Response("public"));
    await state.assets.prepare(["/static/template.html"], {
        signal: state.signal,
    });
    assert.equal(state.requests.length, 2);
});

test("asset preparation limits parallel downloads and propagates its owner lifetime", async (context) => {
    const state = fixture(context);
    let running = 0;
    let peak = 0;
    state.serve(async (_path, options) => {
        running++;
        peak = Math.max(peak, running);
        assert.equal(options.signal, state.signal);
        await Promise.resolve();
        running--;
        return new Response("asset");
    });
    await state.assets.prepare(
        Array.from({ length: 9 }, (_, index) => `/static/icon-${index}.svg`),
        { signal: state.signal },
    );
    assert.equal(peak, 4);
    assert.equal(state.requests.length, 9);
});

test("offline registration is quiet, reconnect prepares resources and disposal removes retries", async (context) => {
    const state = fixture(context);
    setOffline(true);
    const warm = state.assets.register(["/static/icon.svg"], {
        signal: state.signal,
    });
    await warm();
    assert.equal(state.requests.length, 0);
    setOffline(false);
    state.window.dispatchEvent(new Event("cognis:connectivity-changed"));
    await warm();
    assert.equal(state.requests.length, 1);
    state.scope.abort();
    state.window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(state.requests.length, 1);
    await assert.rejects(
        state.assets.prepare(["/static/new.svg"], { signal: state.signal }),
        { name: "AbortError" },
    );
});

test("assets prepare after the current legal consent is accepted", async (context) => {
    const state = fixture(context);
    state.values.set("cognis_offline_requirements", JSON.stringify(["terms"]));
    const warm = state.assets.register(["/static/template.html"], {
        signal: state.signal,
    });
    await warm();
    assert.equal(state.requests.length, 0);
    state.values.set(
        "cognis_offline_receipts",
        JSON.stringify({
            terms: { account: "", allowed: true, revision: "current" },
        }),
    );
    state.window.dispatchEvent(new Event("cognis:offline-policy-changed"));
    await warm();
    assert.equal(state.requests.length, 1);
});
