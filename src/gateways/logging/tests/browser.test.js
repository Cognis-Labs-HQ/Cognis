import { CONSOLE_LEVELS } from "../ui/reuse/levels.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { normalizeDiagnostic } from "../ui/entry.js";
import { safeMetadata } from "../ui/metadata.js";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../ui/reuse/provider-lifecycle.js";
import { bindCapability } from "../../../ui/reuse/capabilities.js";

const log = bindCapability("ui:log");

async function fixture(testContext, { failHandshake = false } = {}) {
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
        Object.keys(CONSOLE_LEVELS).map((level) => [
            level,
            (...args) => output.push({ level, args: args }),
        ]),
    );
    const originalConsole = { ...consoleTarget };
    const provider = loadTestModule(
        new URL("../ui/browser.js", import.meta.url),
        {
            "./console.js": loadTestModule(
                new URL("../ui/console.js", import.meta.url),
                {
                    "/static/reuse/capabilities.js": {
                        bindCapability: () => log,
                    },
                    "./reuse/levels.js": { CONSOLE_LEVELS },
                },
                { console: consoleTarget },
            ),
            "./entry.js": { normalizeDiagnostic },
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
    testContext.after(() => lifecycle.reconcile([]));
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

test("logs run the gateway flow and only gateway permission permits console output", async (testContext) => {
    const runtime = await fixture(testContext);
    assert.equal(
        await log("error", "challenge_request_failed", { component: "tfa" }),
        true,
    );
    assert.equal(runtime.output.length, 0);
    assert.equal(runtime.requests[0].path, "/api/v1/logging/entries");
    assert.deepEqual(JSON.parse(runtime.requests[0].options.body), {
        level: "error",
        message: "challenge_request_failed",
        meta: { component: "tfa", operation: "diagnostic" },
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
    assert.equal(uiCtx.capabilities.get("logging:recentEntries"), undefined);
    for (const method of Object.keys(runtime.originalConsole))
        assert.equal(
            runtime.consoleTarget[method],
            runtime.originalConsole[method],
        );
});

test("worker diagnostics accept only the current controller and detach on disposal", async (testContext) => {
    const runtime = await fixture(testContext);
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

test("console calls reach the gateway with safe context before any browser output", async (testContext) => {
    const runtime = await fixture(testContext);
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

test("failed provider initialization releases its flow, console capture and subscription", async (testContext) => {
    await assert.rejects(
        fixture(testContext, { failHandshake: true }),
        /worker_unavailable/,
    );
    assert.equal(uiCtx.flowExists("logging:emit"), false);
    assert.equal(uiCtx.capabilities.get("logging:browser"), undefined);
    assert.equal(uiCtx.capabilities.get("logging:recentEntries"), undefined);
    const runtime = await fixture(testContext);
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

test("recent diagnostics remain bounded and cannot be mutated by crash-report consumers", async (testContext) => {
    await fixture(testContext);
    for (let index = 0; index < 35; index++)
        await log("info", `history_${index}`);
    const recent = uiCtx.capabilities.get("logging:recentEntries");
    const entries = recent();
    assert.equal(entries.length, 30);
    assert.match(entries[0].message, /^history_5 /);
    assert.match(entries.at(-1).message, /^history_34 /);
    entries[0].message = "changed";
    assert.match(recent()[0].message, /^history_5 /);
});

test("the gateway owns its public log capability and receives deferred calls across remounts", async (testContext) => {
    await log("error", "before_provider", { component: "startup" });
    const host = await fixture(testContext);
    await new Promise(setImmediate);
    assert.equal(typeof uiCtx.capabilities.get("ui:log"), "function");
    assert.equal(
        JSON.parse(host.requests.at(-1).options.body).message,
        "before_provider",
    );
    await host.lifecycle.reconcile([]);
    await log("warn", "between_providers");
    const count = host.requests.length;
    await host.lifecycle.reconcile([{ scriptUrl: "/logging-provider.js" }]);
    await new Promise(setImmediate);
    assert.equal(host.requests.length, count + 1);
    assert.equal(
        JSON.parse(host.requests.at(-1).options.body).message,
        "between_providers",
    );
});
