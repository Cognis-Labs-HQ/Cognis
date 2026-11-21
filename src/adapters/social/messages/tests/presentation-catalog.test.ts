import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore, GatewayRegistry, createCtx } from "@cognis/core";
import { bootstrapSocialAdapter } from "../index.js";
import { MessagesProfileStore } from "./profile-store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

test("Messages bootstrap publishes the presentation provider with adapter availability", async () => {
    const root = createCtx();
    root.registerFlow({
        id: "deprovision-user",
        stages: ["cleanup-dependencies"],
    });
    const capabilities = new CapabilityStore();
    const database: DbExecutor = {
        async ensureTable() {},
        async executeCommand() {
            return { rows: [] };
        },
        async transaction(operation) {
            return operation(database);
        },
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", database);
    capabilities.contribute("social:profileStore", new MessagesProfileStore());
    const providers: Array<{
        scriptUrl: string;
        providesCapabilities: string[];
        isEnabled?: () => boolean;
    }> = [];
    const routes: Array<{ requiredCapabilities?: string[] }> = [];
    let enabled = true;
    await bootstrapSocialAdapter({
        capabilities,
        flow: root.flow,
        gateway: { registerAdapter() {} },
        adapterId: "messages",
        adapterRoot: "",
        gatewayRegistry: new GatewayRegistry(),
        registerRoute() {},
        registerSpaRoute: (route) => routes.push(route),
        registerNavbarPlugin() {},
        registerStaticDir() {},
        isGatewayEnabled: () => true,
        isAdapterEnabled: () => enabled,
        registerCapabilityProvider: (provider) => providers.push(provider),
    });
    const provider = providers.find((entry) =>
        entry.providesCapabilities.includes("social:messagePresentation"),
    );
    assert.ok(provider);
    assert.equal(
        provider.scriptUrl,
        "/static/adapters/social/messages/presentation-provider.js",
    );
    assert.equal(provider.isEnabled?.(), true);
    const receipts = providers.find((entry) =>
        entry.providesCapabilities.includes("social:messageReceipts"),
    );
    assert.equal(
        receipts?.scriptUrl,
        "/static/adapters/social/messages/read-receipts.js",
    );
    assert.ok(
        routes.some((route) =>
            route.requiredCapabilities?.includes("social:messageReceipts"),
        ),
    );
    assert.equal(receipts?.isEnabled?.(), true);
    enabled = false;
    assert.equal(provider.isEnabled?.(), false);
    assert.equal(receipts?.isEnabled?.(), false);
});
