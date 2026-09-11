import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { CoreStudyGateway } from "../../../../gateways/study/gateway.js";
import { bootstrapStudyAdapter, createStudyAdapter } from "../index.js";

function bootstrapContext() {
    const systemCtx = createCtx();
    systemCtx.contributeCapability("system:ctx", systemCtx);
    systemCtx.contributeCapability("db:executor", {
        ensureTable: async () => {},
        executeCommand: async () => ({ rows: [] }),
        transaction: async (
            callback: (executor: unknown) => Promise<unknown>,
        ) => callback(systemCtx.getCapability("db:executor")),
    });
    const routes: unknown[] = [];
    return {
        systemCtx,
        routes,
        context: {
            gateway: new CoreStudyGateway(),
            adapterId: "progress",
            adapterRoot: "",
            capabilities: {
                get: <Value>(key: string) =>
                    systemCtx.getCapability<Value>(key),
                contribute: (key: string, value: unknown) =>
                    systemCtx.contributeCapability(key, value),
            },
            gatewayRegistry: {} as never,
            flow: systemCtx.flow,
            registerRoute: (route: unknown) => routes.push(route),
            registerStaticDir: () => {},
            registerNavbarPlugin: () => {},
            registerPageExtension: () => {},
            isAdapterEnabled: () => true,
        },
    };
}

test("bootstrap contributes the neutral capability, staged flow, and routes", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    assert.ok(fixture.systemCtx.hasCapability("study:progress"));
    assert.ok(fixture.systemCtx.hasFlow("study:progress:recordEvent"));
    assert.equal(fixture.routes.length, 1);
});

test("gateway adapter disablement removes progress from active adapters", async () => {
    const gateway = new CoreStudyGateway();
    gateway.registerAdapter(createStudyAdapter());
    assert.equal(gateway.isAdapterEnabled("progress"), true);
    await gateway.disableAdapter("progress");
    assert.equal(gateway.isAdapterEnabled("progress"), false);
});
