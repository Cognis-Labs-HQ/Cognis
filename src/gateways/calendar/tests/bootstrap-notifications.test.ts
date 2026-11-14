import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    requireBootstrapScope,
    runBootstrapScope,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { bootstrap, completeBootstrap } from "../bootstrap.js";

test("Calendar registers notifications during completion and leaves unrelated runtime requests untouched", async () => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const routeRegistry = new RouteRegistry();
    const ctx = {
        capabilities,
        routeRegistry,
        gatewayRegistry: new GatewayRegistry(),
        uiRegistry: new UIRegistry(),
        flow: root.flow,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("auth:routeContext", createAuthContext(new Map()));
    // Notification delivery can bootstrap later than Calendar.
    await runBootstrapScope(root, "gateway:calendar", () =>
        bootstrap(ctx as never),
    );
    const registrations: string[] = [];
    const registerCategory = (id: string) => {
        assert.equal(requireBootstrapScope(root).owner, "gateway:calendar");
        registrations.push(id);
    };
    capabilities.contribute("notify:registerCategory", registerCategory);
    await runBootstrapScope(root, "gateway:calendar", () =>
        completeBootstrap(ctx as never),
    );
    assert.deepEqual(registrations, ["calendar"]);
    for (const pathname of [
        "/api/v1/ui/capability-providers",
        "/api/v1/modules/terms-of-service/consent",
        "/.well-known/appspecific/com.chrome.devtools.json",
    ]) {
        const request = new RequestRecorder({ method: "GET" });
        const response = new ResponseRecorder();
        for (const { handler } of routeRegistry.getEntries()) {
            assert.equal(
                await handler(
                    request as never,
                    response as never,
                    new URL(pathname, "http://localhost"),
                ),
                false,
            );
        }
        assert.equal(response.statusCode, 0);
    }
    assert.deepEqual(registrations, ["calendar"]);
    assert.throws(
        () => registerCategory("late"),
        /bootstrap_registration_closed/,
    );
});
