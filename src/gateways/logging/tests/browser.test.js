import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { safeMetadata } from "../ui/metadata.js";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../ui/reuse/provider-lifecycle.js";
import { log, subscribeDiagnostics } from "../../../ui/reuse/diagnostics.js";

async function fixture(t, { failHandshake = false } = {}) {
    let token = "test-token";
    let allowed = false;
    let status = 204;
    let failure = false;
    const requests = [];
    const output = [];
    const worker = new EventTarget();
    worker.controller = {
        postMessage() {
            if (failHandshake) throw new Error("worker_unavailable");
        },
    };
    const consoleTarget = Object.fromEntries(
        ["debug", "info", "warn", "error", "log"].map((level) => [
            level,
            (...args) => output.push({ level, args }),
        ]),
    );
    const originalConsole = { ...consoleTarget };
    const provider = loadTestModule(
        new URL("../ui/browser.js", import.meta.url),
        {
            "./console.js": loadTestModule(
                new URL("../ui/console.js", import.meta.url),
                { "/static/reuse/diagnostics.js": { log } },
            ),
            "./metadata.js": { safeMetadata },
            "./client.js": loadTestModule(
                new URL("../ui/client.js", import.meta.url),
                {},
                {
                    AbortSignal,
                    fetch: async (path, options) => {
                        requests.push({ path, options });
                        if (failure) throw new TypeError("offline");
                        return new Response(null, {
                            status,
                            headers: {
                                "x-cognis-log-console": String(allowed),
                            },
                        });
                    },
                },
            ),
            "/static/reuse/diagnostics.js": { subscribeDiagnostics },
        },
        {
            globalThis: {
                localStorage: { getItem: () => token },
                navigator: { serviceWorker: worker },
            },
            console: consoleTarget,
        },
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => provider,
    });
    await lifecycle.reconcile([{ scriptUrl: "/logging-provider.js" }]);
    t.after(() => lifecycle.reconcile([]));
    return {
        originalConsole,
        requests,
        output,
        worker,
        lifecycle,
        consoleTarget,
        set allowed(value) {
            allowed = value;
        },
        set token(value) {
            token = value;
        },
        set status(value) {
            status = value;
        },
        set failure(value) {
            failure = value;
        },
    };
}

test("logs run the gateway flow and only gateway permission permits console output", async (t) => {
    const runtime = await fixture(t);
    assert.equal(
        await log("error", "challenge_request_failed", { component: "tfa" }),
        true,
    );
    assert.equal(runtime.output.length, 0);
    assert.equal(runtime.requests[0].path, "/api/v1/logging/entries");
    assert.deepEqual(JSON.parse(runtime.requests[0].options.body), {
        level: "error",
        message: "challenge_request_failed",
        meta: { component: "tfa" },
    });
    runtime.allowed = true;
    assert.equal(await log("warn", "translation_bundle_load_failed"), true);
    assert.equal(runtime.output.length, 1);
    runtime.status = 503;
    assert.equal(await log("error", "operation_failed"), false);
    runtime.failure = true;
    assert.equal(await log("error", "operation_failed"), false);
    assert.equal(runtime.output.length, 1);
    runtime.token = "";
    const count = runtime.requests.length;
    assert.equal(await log("error", "anonymous_operation_failed"), false);
    assert.equal(runtime.requests.length, count);
    await runtime.lifecycle.reconcile([]);
    assert.equal(uiCtx.flowExists("logging:emit"), false);
    assert.equal(uiCtx.capabilities.get("logging:browser"), undefined);
    for (const method of Object.keys(runtime.originalConsole))
        assert.equal(
            runtime.consoleTarget[method],
            runtime.originalConsole[method],
        );
});

test("worker diagnostics accept only the current controller and detach on disposal", async (t) => {
    const runtime = await fixture(t);
    const dispatch = (source) => {
        const event = new Event("message");
        Object.assign(event, {
            source,
            data: {
                type: "COGNIS_LOG",
                entry: {
                    level: "error",
                    message: "public_asset_cache_write_failed",
                },
            },
        });
        runtime.worker.dispatchEvent(event);
    };
    dispatch({});
    assert.equal(runtime.requests.length, 0);
    dispatch(runtime.worker.controller);
    await new Promise(setImmediate);
    assert.equal(runtime.requests.length, 1);
    await runtime.lifecycle.reconcile([]);
    dispatch(runtime.worker.controller);
    assert.equal(runtime.requests.length, 1);
});

test("console calls reach the gateway with safe context before any browser output", async (t) => {
    const runtime = await fixture(t);
    runtime.consoleTarget.error("adapter_operation_failed", {
        component: "example",
        status: 503,
        password: "private",
        nested: { accessToken: "private", operation: "refresh" },
        error: new Error("private response"),
    });
    await new Promise(setImmediate);
    assert.equal(runtime.requests.length, 1);
    assert.equal(runtime.output.length, 0);
    assert.deepEqual(JSON.parse(runtime.requests[0].options.body), {
        level: "error",
        message: "adapter_operation_failed",
        meta: {
            component: "example",
            operation: "console",
            status: 503,
            nested: { operation: "refresh" },
            error: { errorName: "Error" },
        },
    });
    runtime.allowed = true;
    runtime.consoleTarget.warn("adapter_operation_failed");
    await new Promise(setImmediate);
    assert.equal(runtime.requests.length, 2);
    assert.equal(runtime.output.length, 1);
    assert.equal(runtime.output[0].args[0], "adapter_operation_failed");
});

test("failed provider initialization releases its flow, console capture and subscription", async (t) => {
    await assert.rejects(
        fixture(t, { failHandshake: true }),
        /worker_unavailable/,
    );
    assert.equal(uiCtx.flowExists("logging:emit"), false);
    assert.equal(uiCtx.capabilities.get("logging:browser"), undefined);
    const runtime = await fixture(t);
    assert.equal(await log("error", "provider_recovered"), true);
    assert.equal(runtime.requests.length, 1);
});

test("diagnostic context has an overall size budget as well as per-field limits", () => {
    const context = Object.fromEntries(
        Array.from({ length: 32 }, (_, index) => [
            String(index),
            { detail: "x".repeat(2000), password: "private" },
        ]),
    );
    const safe = safeMetadata(context);
    assert.ok(JSON.stringify(safe).length < 10_000);
    assert.equal(safe["0"].detail.length, 512);
});
